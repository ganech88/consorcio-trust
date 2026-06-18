-- ============================================================
-- 047 · Funciones competitivas (Ola 1)
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
-- Pólizas de seguro, presupuestos (aprobación), cobranzas no
-- identificadas + campos white-label de la administración.
-- RLS: admin del consorcio gestiona; miembros leen (salvo cobranzas).
-- ============================================================

-- 1) Pólizas de seguro -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id  uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  insurer        text NOT NULL,
  policy_number  text,
  type           text,
  coverage_amount numeric,
  premium        numeric,
  start_date     date,
  end_date       date,
  broker         text,
  notes          text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_consortium ON public.insurance_policies(consortium_id);
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insurance_select_members ON public.insurance_policies;
CREATE POLICY insurance_select_members ON public.insurance_policies
  FOR SELECT USING (consortium_id = current_consortium_id() OR is_super_admin());
DROP POLICY IF EXISTS insurance_manage_admin ON public.insurance_policies;
CREATE POLICY insurance_manage_admin ON public.insurance_policies
  FOR ALL USING (is_consortium_admin(consortium_id) OR is_super_admin())
  WITH CHECK (is_consortium_admin(consortium_id) OR is_super_admin());

-- 2) Presupuestos (aprobación por consejo/admin) ---------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id  uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  supplier_id    uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  title          text NOT NULL,
  description    text,
  amount         numeric NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by     uuid REFERENCES auth.users(id),
  decided_at     timestamptz,
  attachment_url text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budgets_consortium ON public.budgets(consortium_id);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budgets_select_members ON public.budgets;
CREATE POLICY budgets_select_members ON public.budgets
  FOR SELECT USING (consortium_id = current_consortium_id() OR is_super_admin());
DROP POLICY IF EXISTS budgets_manage_admin ON public.budgets;
CREATE POLICY budgets_manage_admin ON public.budgets
  FOR ALL USING (is_consortium_admin(consortium_id) OR is_super_admin())
  WITH CHECK (is_consortium_admin(consortium_id) OR is_super_admin());

-- 3) Cobranzas no identificadas (solo admin) -------------------------------
CREATE TABLE IF NOT EXISTS public.unidentified_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id    uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  amount           numeric NOT NULL,
  paid_at          date NOT NULL DEFAULT current_date,
  method           text,
  reference        text,
  notes            text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned')),
  assigned_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES auth.users(id),
  assigned_at      timestamptz,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unidentified_consortium ON public.unidentified_payments(consortium_id);
ALTER TABLE public.unidentified_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unidentified_manage_admin ON public.unidentified_payments;
CREATE POLICY unidentified_manage_admin ON public.unidentified_payments
  FOR ALL USING (is_consortium_admin(consortium_id) OR is_super_admin())
  WITH CHECK (is_consortium_admin(consortium_id) OR is_super_admin());

-- 4) White-label de la administración --------------------------------------
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_name text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_logo_url text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_phone text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_address text;
ALTER TABLE public.consortia ADD COLUMN IF NOT EXISTS admin_signature_url text;
