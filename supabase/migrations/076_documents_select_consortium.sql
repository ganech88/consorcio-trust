-- 076: los residentes pueden ver los documentos APROBADOS de su consorcio
-- (antes solo veían los propios; los subidos por el admin no aparecían en DocsView).
DROP POLICY IF EXISTS "members read own documents" ON public.documents;
CREATE POLICY "documents_select_scoped" ON public.documents
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (consortium_id = current_consortium_id() AND status = 'approved')
    OR is_consortium_admin(consortium_id)
    OR is_super_admin()
  );
