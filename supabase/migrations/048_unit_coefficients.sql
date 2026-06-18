-- ============================================================
-- 048 · Coeficiente (porcentual) de copropiedad por unidad
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
-- Cada unidad paga su % del total de la expensa. La suma de los
-- coeficientes de un consorcio deberia dar 100.
-- ============================================================
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS coefficient numeric;
COMMENT ON COLUMN public.units.coefficient IS 'Porcentaje (coeficiente) de copropiedad de la unidad. La suma del consorcio deberia dar 100.';
