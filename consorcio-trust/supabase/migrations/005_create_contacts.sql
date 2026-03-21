-- ============================================================
-- Migración 005: Tabla de contactos del consorcio
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  role         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'administracion'
                       CHECK (category IN ('administracion', 'emergencias')),
  phone        TEXT,
  email        TEXT,
  hours        TEXT,
  color        TEXT    NOT NULL DEFAULT 'blue',
  emergency    BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  consortium_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select"
  ON contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "contacts_insert_admin"
  ON contacts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "contacts_update_admin"
  ON contacts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "contacts_delete_admin"
  ON contacts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Datos iniciales de contactos de emergencia (sin consortium_id = aplican a todos)
INSERT INTO contacts (name, role, category, phone, color, emergency, sort_order) VALUES
  ('Bomberos',  'Emergencias de incendio',  'emergencias', '100', 'red',     true, 10),
  ('SAME',      'Emergencias médicas',       'emergencias', '107', 'emerald', true, 20),
  ('Policía',   'Emergencias de seguridad',  'emergencias', '911', 'amber',   true, 30)
ON CONFLICT DO NOTHING;
