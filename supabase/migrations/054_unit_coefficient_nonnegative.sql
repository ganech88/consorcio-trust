-- ============================================================
-- 054 · Coeficiente de unidad no negativo (via MCP)
-- Defensa en DB ante un coeficiente negativo (que distorsionaria
-- el calculo de distribucion de expensas por coeficiente).
-- ============================================================
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_coefficient_nonneg;
ALTER TABLE public.units ADD CONSTRAINT units_coefficient_nonneg
  CHECK (coefficient IS NULL OR coefficient >= 0);
