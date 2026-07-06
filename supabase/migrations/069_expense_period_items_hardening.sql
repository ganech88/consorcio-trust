-- 069: (a) trigger que impide al residente modificar monto/identidad de su expensa
-- y limita sus transiciones de estado a pending<->reported (la policy RLS 049/062 no
-- restringe columnas, así que un residente podía adulterar `amount` vía API);
-- (b) columna unit_uuid (FK real a units) con backfill desde el nombre —
-- expense_period_items.unit_id guardaba el NOMBRE de la unidad (texto).

CREATE OR REPLACE FUNCTION public.protect_period_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid uuid;
BEGIN
  -- Procesos sin sesión (service_role, jobs internos): sin restricción
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT ep.consortium_id INTO v_cid FROM expense_periods ep WHERE ep.id = COALESCE(NEW.period_id, OLD.period_id);
  IF is_super_admin() OR is_consortium_admin(v_cid) THEN RETURN NEW; END IF;
  -- Residente: solo informar/des-informar su pago, sin tocar monto ni identidad
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
     OR NEW.unit_uuid IS DISTINCT FROM OLD.unit_uuid
     OR NEW.period_id IS DISTINCT FROM OLD.period_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'No tenés permiso para modificar estos campos de la expensa';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'pending' AND NEW.status = 'reported')
     AND NOT (OLD.status = 'reported' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'Transición de estado no permitida';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS unit_uuid uuid REFERENCES public.units(id);

DROP TRIGGER IF EXISTS trg_protect_period_items ON public.expense_period_items;
CREATE TRIGGER trg_protect_period_items
  BEFORE UPDATE ON public.expense_period_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_period_items();

-- Backfill: matchear nombre de unidad dentro del consorcio del período
UPDATE public.expense_period_items epi
SET unit_uuid = u.id
FROM public.expense_periods ep
JOIN public.units u ON u.consortium_id = ep.consortium_id
WHERE ep.id = epi.period_id AND u.name = epi.unit_id AND epi.unit_uuid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS expense_period_items_period_unit_uuid_key
  ON public.expense_period_items (period_id, unit_uuid) WHERE unit_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_epi_unit_uuid ON public.expense_period_items (unit_uuid);
