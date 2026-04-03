-- Módulo de multas
CREATE TABLE IF NOT EXISTS fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE NOT NULL,
  unit_id text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  amount numeric(12,2) NOT NULL,
  reason text NOT NULL,
  fine_date date NOT NULL DEFAULT CURRENT_DATE,
  period text, -- periodo al que aplica, ej "2026-04"
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid','cancelled','waived')),
  applied_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

-- Residentes ven sus propias multas
CREATE POLICY "user read own fines" ON fines
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND consortium_id = fines.consortium_id
    )
  );

-- Solo admin puede crear/modificar/eliminar
CREATE POLICY "admin manage fines" ON fines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND consortium_id = fines.consortium_id
    )
  );

CREATE INDEX IF NOT EXISTS fines_consortium_idx ON fines(consortium_id);
CREATE INDEX IF NOT EXISTS fines_unit_idx ON fines(unit_id);
CREATE INDEX IF NOT EXISTS fines_user_idx ON fines(user_id);
CREATE INDEX IF NOT EXISTS fines_period_idx ON fines(period);
CREATE INDEX IF NOT EXISTS fines_status_idx ON fines(status);
