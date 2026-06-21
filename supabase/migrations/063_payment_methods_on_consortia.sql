-- 063 · Medios de pago del consorcio (los carga el admin; los ve el residente
-- para transferir por fuera y luego informar el pago). Son columnas en consortia
-- (visibles a los miembros por la policy SELECT existente).
ALTER TABLE public.consortia
  ADD COLUMN IF NOT EXISTS payment_cbu text,
  ADD COLUMN IF NOT EXISTS payment_alias text,
  ADD COLUMN IF NOT EXISTS payment_bank text,
  ADD COLUMN IF NOT EXISTS payment_holder text,
  ADD COLUMN IF NOT EXISTS payment_instructions text;
