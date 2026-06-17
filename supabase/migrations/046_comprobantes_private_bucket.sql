-- Bucket de comprobantes PRIVADO: cierra el acceso publico y el listado.
-- Lectura por signed URLs, scopeada a quien subio (owner) o admin/super_admin.
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
UPDATE storage.buckets SET public = false WHERE id = 'comprobantes';

-- Quitar policies publicas (listado + lectura + insert/update abiertos)
DROP POLICY IF EXISTS "Permitir todo k8lwzj_0" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo k8lwzj_1" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo k8lwzj_2" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for comprobantes" ON storage.objects;

-- Lectura: solo el que subio el archivo o un admin/super_admin
DROP POLICY IF EXISTS "comprobantes_select_owner_or_admin" ON storage.objects;
CREATE POLICY "comprobantes_select_owner_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprobantes' AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    )
  );

-- (La subida autenticada ya existe: "Authenticated users can upload comprobantes")
