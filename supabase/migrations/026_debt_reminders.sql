-- Configuración de recordatorios automáticos de deuda
ALTER TABLE consortia ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false;
ALTER TABLE consortia ADD COLUMN IF NOT EXISTS reminder_days_before_due integer DEFAULT 3;
ALTER TABLE consortia ADD COLUMN IF NOT EXISTS reminder_days_after_due integer DEFAULT 2;

CREATE TABLE IF NOT EXISTS debt_reminders_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  unit_id text,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','in_app')),
  amount numeric(12,2),
  message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE debt_reminders_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read reminders_log" ON debt_reminders_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS drl_consortium_idx ON debt_reminders_log(consortium_id);
CREATE INDEX IF NOT EXISTS drl_sent_at_idx ON debt_reminders_log(sent_at);
