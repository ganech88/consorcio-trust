-- Tracking de lecturas de comunicados
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede registrar su propia lectura
CREATE POLICY "user insert own read" ON announcement_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Cada usuario puede ver sus propias lecturas
CREATE POLICY "user read own reads" ON announcement_reads
  FOR SELECT USING (user_id = auth.uid());

-- Admin puede ver todas las lecturas de su consorcio
CREATE POLICY "admin read all reads" ON announcement_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS ar_announcement_idx ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS ar_user_idx ON announcement_reads(user_id);
