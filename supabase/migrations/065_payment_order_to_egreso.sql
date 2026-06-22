-- 065 · Unificar Proveedores con Egresos: al marcar una orden de pago como
-- 'paid', se genera automaticamente el egreso (expenses_log) — asi se carga una
-- sola vez y alimenta la liquidacion/rendicion. source_order_id evita duplicados.

ALTER TABLE public.expenses_log ADD COLUMN IF NOT EXISTS source_order_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_expenses_log_source_order
  ON public.expenses_log(source_order_id);

CREATE OR REPLACE FUNCTION public.payment_order_to_egreso()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_supplier public.suppliers%ROWTYPE;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT * INTO v_supplier FROM public.suppliers WHERE id = NEW.supplier_id;
    INSERT INTO public.expenses_log
      (description, category, amount, date, provider, receipt_url, consortium_id, created_by, source_order_id)
    VALUES (
      COALESCE(NULLIF(NEW.description, ''), 'Pago a proveedor'),
      COALESCE(NULLIF(v_supplier.category, ''), 'Proveedores'),
      NEW.amount,
      COALESCE(NEW.paid_at::date, CURRENT_DATE),
      v_supplier.name,
      NEW.attachment_url,
      NEW.consortium_id,
      COALESCE(NEW.paid_by, NEW.created_by),
      NEW.id
    )
    ON CONFLICT (source_order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_order_to_egreso ON public.payment_orders;
CREATE TRIGGER trg_payment_order_to_egreso
  AFTER UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.payment_order_to_egreso();
