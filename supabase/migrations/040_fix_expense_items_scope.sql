-- Fuga: expense_items era legible por cualquier usuario autenticado (cross-consorcio).
-- Se acota por consorcio via su expenses_summary. Aplicada a kldgbgxycmvywvvftuvi via MCP.
DROP POLICY IF EXISTS "members read expense_items" ON public.expense_items;
DROP POLICY IF EXISTS "admin manage expense_items" ON public.expense_items;

CREATE POLICY "expense_items_select_scoped" ON public.expense_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.expenses_summary s
    WHERE s.id = expense_items.summary_id
      AND (s.consortium_id = public.current_consortium_id()
           OR public.is_consortium_admin(s.consortium_id)
           OR public.is_super_admin())
  ));

CREATE POLICY "expense_items_admin_manage" ON public.expense_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.expenses_summary s
    WHERE s.id = expense_items.summary_id
      AND (public.is_consortium_admin(s.consortium_id) OR public.is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses_summary s
    WHERE s.id = expense_items.summary_id
      AND (public.is_consortium_admin(s.consortium_id) OR public.is_super_admin())
  ));

-- expenses_summary estaba con RLS habilitado y SIN policies (deny-all).
DROP POLICY IF EXISTS "expenses_summary_select_scoped" ON public.expenses_summary;
CREATE POLICY "expenses_summary_select_scoped" ON public.expenses_summary
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id()
         OR public.is_consortium_admin(consortium_id)
         OR public.is_super_admin());

DROP POLICY IF EXISTS "expenses_summary_admin_manage" ON public.expenses_summary;
CREATE POLICY "expenses_summary_admin_manage" ON public.expenses_summary
  FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
