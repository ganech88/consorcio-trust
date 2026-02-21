-- ============================================
-- Migración: Preparar profiles para WhatsApp bot
-- ============================================

-- 1. Agregar columnas necesarias (si no existen)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consortium_id UUID REFERENCES consortia(id);

-- 2. Crear índice para búsqueda rápida por teléfono
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone);

-- 3. Crear bucket de storage para comprobantes (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de acceso al bucket (con DO para manejar si ya existen)
DO $$
BEGIN
  -- Usuarios autenticados pueden subir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload comprobantes'
  ) THEN
    CREATE POLICY "Authenticated users can upload comprobantes"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'comprobantes');
  END IF;

  -- Lectura pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for comprobantes'
  ) THEN
    CREATE POLICY "Public read access for comprobantes"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'comprobantes');
  END IF;

  -- Service role acceso total
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access comprobantes'
  ) THEN
    CREATE POLICY "Service role full access comprobantes"
    ON storage.objects FOR ALL TO service_role
    USING (bucket_id = 'comprobantes')
    WITH CHECK (bucket_id = 'comprobantes');
  END IF;
END $$;
