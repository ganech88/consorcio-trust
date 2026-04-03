-- ─── Feature 5: Control de visitas y encomiendas ─────────────────────────────

CREATE TABLE IF NOT EXISTS visitors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         text NOT NULL,
  user_id         uuid REFERENCES auth.users(id),
  name            text NOT NULL,
  doc_number      text,
  authorized_date date NOT NULL DEFAULT CURRENT_DATE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  consortium_id   uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       text NOT NULL,
  user_id       uuid REFERENCES auth.users(id),
  description   text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz,
  consortium_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Visitantes: usuario ve los suyos, admin ve todos
CREATE POLICY "visitors_read_own" ON visitors
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "visitors_insert_own" ON visitors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "visitors_update_own" ON visitors
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "visitors_delete_own" ON visitors
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Encomiendas: usuario ve las de su unidad, admin ve todas
CREATE POLICY "packages_read_own" ON packages
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "packages_admin_insert" ON packages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "packages_admin_update" ON packages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índices
CREATE INDEX IF NOT EXISTS visitors_unit_idx ON visitors(unit_id);
CREATE INDEX IF NOT EXISTS visitors_user_idx ON visitors(user_id);
CREATE INDEX IF NOT EXISTS visitors_consortium_idx ON visitors(consortium_id);
CREATE INDEX IF NOT EXISTS packages_unit_idx ON packages(unit_id);
CREATE INDEX IF NOT EXISTS packages_user_idx ON packages(user_id);
CREATE INDEX IF NOT EXISTS packages_consortium_idx ON packages(consortium_id);
