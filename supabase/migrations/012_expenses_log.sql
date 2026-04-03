-- ─── Feature 6: Balance financiero ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description   text NOT NULL,
  category      text NOT NULL DEFAULT 'general',
  amount        numeric(12,2) NOT NULL,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  provider      text,
  receipt_url   text,
  consortium_id uuid,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE expenses_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_log_read_all" ON expenses_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "expenses_log_admin_write" ON expenses_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índices
CREATE INDEX IF NOT EXISTS expenses_log_consortium_idx ON expenses_log(consortium_id);
CREATE INDEX IF NOT EXISTS expenses_log_date_idx ON expenses_log(date);
CREATE INDEX IF NOT EXISTS expenses_log_category_idx ON expenses_log(category);
