-- 067 (retroactiva): bucket documents privado + policies para authenticated.
-- Aplicada a mano el 2026-07-05 vía MCP; versionada retroactivamente. Idempotente.
UPDATE storage.buckets SET public = false WHERE id = 'documents';

DROP POLICY IF EXISTS "documents_read_auth" ON storage.objects;
CREATE POLICY "documents_read_auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_insert_auth" ON storage.objects;
CREATE POLICY "documents_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_delete_owner_admin" ON storage.objects;
CREATE POLICY "documents_delete_owner_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (owner = auth.uid() OR is_super_admin()));
