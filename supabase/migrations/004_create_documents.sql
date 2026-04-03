-- ============================================================
-- Migración 004: Tabla de documentos + bucket de Storage
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general'
                           CHECK (category IN ('reglamentos', 'actas', 'expensas', 'seguros', 'general')),
  file_path    TEXT        NOT NULL,
  file_url     TEXT        NOT NULL,
  consortium_id UUID,
  uploaded_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select"
  ON documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "documents_insert_admin"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "documents_delete_admin"
  ON documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket para documentos del consorcio
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage: lectura pública para autenticados
CREATE POLICY "documents_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Storage: solo admin puede subir
CREATE POLICY "documents_storage_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage: solo admin puede eliminar
CREATE POLICY "documents_storage_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
