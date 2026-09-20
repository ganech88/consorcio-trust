-- ============================================================
-- 077 · Conciliación de pagos + interés por mora + datos Ley 941
--
-- (a) payments se vincula al cargo que salda (expense_period_items o fines).
--     Aprobar un pago vinculado marca el cargo como pagado (trigger) => la
--     cuenta corriente refleja el saldo real. Un solo registro de pago
--     (payments) para pagos informados, WhatsApp y MercadoPago.
-- (b) Interés por mora configurable por consorcio (tasa mensual, días de
--     gracia). Se calcula en la app y en las edge functions con la misma
--     fórmula: capital * (tasa/100) * (días de atraso / 30).
-- (c) Ley 941 (CABA): matrícula RPA, CUIT del consorcio y de la
--     administración, para la liquidación con formato legal.
-- ============================================================

-- ---------- (a) Conciliación ----------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS period_item_id uuid REFERENCES public.expense_period_items(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fine_id uuid REFERENCES public.fines(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mp_preference_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mp_status text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mp_external_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_mp_payment_id_key ON public.payments (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_mp_external_reference_key ON public.payments (mp_external_reference) WHERE mp_external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_period_item ON public.payments (period_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_fine ON public.payments (fine_id);

-- Al aprobar un pago vinculado, saldar el cargo. Al des-aprobar (rechazo posterior), reabrirlo
-- solo si no hay otro pago aprobado para el mismo cargo.
CREATE OR REPLACE FUNCTION public.reconcile_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    IF NEW.period_item_id IS NOT NULL THEN
      UPDATE expense_period_items
         SET status = 'paid', paid_at = COALESCE(paid_at, NEW.paid_at),
             approved_by = COALESCE(approved_by, NEW.approved_by), approved_at = COALESCE(approved_at, NEW.approved_at),
             payment_method = COALESCE(NEW.payment_method, payment_method),
             receipt_url = COALESCE(receipt_url, NEW.proof_url)
       WHERE id = NEW.period_item_id AND status <> 'paid';
    END IF;
    IF NEW.fine_id IS NOT NULL THEN
      UPDATE fines SET status = 'paid' WHERE id = NEW.fine_id AND status <> 'paid';
    END IF;
  ELSIF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    IF NEW.period_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.period_item_id = NEW.period_item_id AND p.status = 'approved' AND p.id <> NEW.id
    ) THEN
      UPDATE expense_period_items SET status = 'pending', paid_at = NULL, approved_by = NULL, approved_at = NULL WHERE id = NEW.period_item_id;
    END IF;
    IF NEW.fine_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.fine_id = NEW.fine_id AND p.status = 'approved' AND p.id <> NEW.id
    ) THEN
      UPDATE fines SET status = 'active' WHERE id = NEW.fine_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_reconcile ON public.payments;
CREATE TRIGGER trg_payments_reconcile
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.reconcile_payment();

-- El residente puede crear pagos solo propios, 'pending', sin tocar campos MP,
-- y solo contra cargos de su unidad. (Los pagos MP los crea la edge function con service_role.)
CREATE OR REPLACE FUNCTION public.protect_payments_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- service_role
  IF NEW.unit_id IS NOT NULL THEN
    SELECT consortium_id INTO v_cid FROM units WHERE id = NEW.unit_id;
  END IF;
  IF is_super_admin() OR (v_cid IS NOT NULL AND is_consortium_admin(v_cid)) THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'No podés registrar pagos de otro usuario'; END IF;
  IF NEW.status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Un pago informado nace pendiente'; END IF;
  IF NEW.mp_payment_id IS NOT NULL OR NEW.mp_preference_id IS NOT NULL OR NEW.mp_external_reference IS NOT NULL OR NEW.approved_by IS NOT NULL THEN
    RAISE EXCEPTION 'Campos reservados';
  END IF;
  IF NEW.period_item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM expense_period_items i LEFT JOIN units u ON u.id = i.unit_uuid
     WHERE i.id = NEW.period_item_id AND (i.user_id = auth.uid() OR u.owner_id = auth.uid() OR u.tenant_id = auth.uid())
  ) THEN RAISE EXCEPTION 'La expensa no pertenece a tu unidad'; END IF;
  IF NEW.fine_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM fines f LEFT JOIN units u ON u.id = f.unit_id
     WHERE f.id = NEW.fine_id AND (f.user_id = auth.uid() OR u.owner_id = auth.uid() OR u.tenant_id = auth.uid())
  ) THEN RAISE EXCEPTION 'La multa no pertenece a tu unidad'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_protect_insert ON public.payments;
CREATE TRIGGER trg_payments_protect_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_payments_insert();

-- Al informar un pago vinculado a un item de período, el item pasa a 'reported'
-- (así el admin lo ve en Liquidación y el residente en Mis expensas).
CREATE OR REPLACE FUNCTION public.mark_item_reported_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.period_item_id IS NOT NULL AND NEW.status = 'pending' AND NEW.payment_method IS DISTINCT FROM 'mercadopago' THEN
    UPDATE expense_period_items
       SET status = 'reported', reported_at = COALESCE(reported_at, now()),
           receipt_url = COALESCE(NEW.proof_url, receipt_url), payment_method = COALESCE(NEW.payment_method, payment_method),
           payment_notes = COALESCE(NEW.notes, payment_notes)
     WHERE id = NEW.period_item_id AND status = 'pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_mark_reported ON public.payments;
CREATE TRIGGER trg_payments_mark_reported
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.mark_item_reported_on_payment();

-- Rechazar un pago informado vinculado reabre el item (reported -> pending)
CREATE OR REPLACE FUNCTION public.reopen_item_on_payment_reject()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' AND NEW.period_item_id IS NOT NULL THEN
    UPDATE expense_period_items SET status = 'pending', reported_at = NULL
     WHERE id = NEW.period_item_id AND status = 'reported';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_reopen_on_reject ON public.payments;
CREATE TRIGGER trg_payments_reopen_on_reject
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.reopen_item_on_payment_reject();

-- Residente: puede insertar sus pagos (RLS; el trigger valida el resto)
DROP POLICY IF EXISTS payments_insert_own ON public.payments;
CREATE POLICY payments_insert_own ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------- (b) Interés por mora ----------
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS late_interest_monthly_pct numeric(6,3) NOT NULL DEFAULT 0;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS late_interest_grace_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.consortia DROP CONSTRAINT IF EXISTS consortia_late_interest_chk;
ALTER TABLE public.consortia ADD CONSTRAINT consortia_late_interest_chk
  CHECK (late_interest_monthly_pct >= 0 AND late_interest_monthly_pct <= 30 AND late_interest_grace_days >= 0 AND late_interest_grace_days <= 90);

-- Misma fórmula que src/lib/mora.js y las edge functions (por si se quiere usar en SQL)
CREATE OR REPLACE FUNCTION public.late_interest(p_amount numeric, p_due date, p_monthly_pct numeric, p_grace_days int, p_as_of date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_due IS NULL OR COALESCE(p_monthly_pct,0) <= 0 THEN 0
    WHEN (p_as_of - (p_due + COALESCE(p_grace_days,0))) <= 0 THEN 0
    ELSE round(p_amount * (p_monthly_pct/100.0) * ((p_as_of - (p_due + COALESCE(p_grace_days,0)))/30.0), 2)
  END;
$$;

-- ---------- (c) Ley 941 ----------
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS cuit text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_rpa_license text;   -- Matrícula RPA (CABA, Ley 941)
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_cuit text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_email text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS bank_account_label text;  -- "Cuenta a nombre del consorcio" que exige la ley
