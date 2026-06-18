-- ============================================================
-- 053 · Evitar distribuir dos veces la misma liquidacion (via MCP)
-- Antes, clickear "Distribuir por coeficiente" de nuevo duplicaba
-- los items del periodo. Dedup conservando paid > reported > pending
-- (para no perder pagos) + indice unico (period_id, unit_id).
-- ============================================================
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY period_id, unit_id
      ORDER BY (status = 'paid') DESC, (status = 'reported') DESC, created_at ASC
    ) AS rn
  FROM public.expense_period_items
)
DELETE FROM public.expense_period_items e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_period_item_unit
  ON public.expense_period_items (period_id, unit_id);
