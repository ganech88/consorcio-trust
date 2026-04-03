-- ─── Feature 3: Votaciones y encuestas ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS polls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  options       jsonb NOT NULL DEFAULT '[]',   -- array de strings
  ends_at       timestamptz NOT NULL,
  consortium_id uuid,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid REFERENCES polls(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

-- RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_read_all" ON polls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "polls_admin_write" ON polls
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "poll_votes_read_all" ON poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "poll_votes_insert_own" ON poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS polls_consortium_idx ON polls(consortium_id);
CREATE INDEX IF NOT EXISTS polls_ends_at_idx ON polls(ends_at);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_idx ON poll_votes(user_id);
