-- ============================================================
-- 049 · Flujo de pago de la expensa por unidad (item de período)
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
-- El residente informa el pago (status 'reported') y el admin lo
-- aprueba ('paid'). El residente NO puede auto-marcarse 'paid'.
-- ============================================================
ALTER TABLE public.expense_period_items DROP CONSTRAINT IF EXISTS expense_period_items_status_check;
ALTER TABLE public.expense_period_items ADD CONSTRAINT expense_period_items_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'reported'::text, 'paid'::text]));

ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS payment_notes text;
ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.expense_period_items ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- El residente solo puede dejar su item en 'pending' o 'reported' (no 'paid')
DROP POLICY IF EXISTS expense_period_items_user_update ON public.expense_period_items;
CREATE POLICY expense_period_items_user_update ON public.expense_period_items
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = ANY (ARRAY['pending'::text, 'reported'::text]));
