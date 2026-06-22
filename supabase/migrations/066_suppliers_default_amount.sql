-- 066 · Proveedores "conocidos": monto habitual (se pre-carga al crear la orden)
-- y flag de recurrente mensual (para generar las ordenes del mes de una).
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS default_amount numeric,
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;
