-- ─── Feature 4: Calendario del edificio ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  type          text NOT NULL DEFAULT 'general'
                CHECK (type IN ('mantenimiento','reunion','corte','fumigacion','general')),
  start_date    timestamptz NOT NULL,
  end_date      timestamptz,
  all_day       boolean NOT NULL DEFAULT false,
  consortium_id uuid,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read_all" ON events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_admin_write" ON events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índices
CREATE INDEX IF NOT EXISTS events_consortium_idx ON events(consortium_id);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
