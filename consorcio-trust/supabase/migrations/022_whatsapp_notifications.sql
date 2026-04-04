-- Migration 022: WhatsApp notifications log
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id       UUID REFERENCES consortia(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone               TEXT NOT NULL,
  message             TEXT NOT NULL,
  status              TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  whatsapp_message_id TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see all notifications for their consortium
CREATE POLICY "Admins can see notifications"
  ON whatsapp_notifications
  FOR SELECT
  TO authenticated
  USING (
    consortium_id IN (
      SELECT consortium_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_consortium
  ON whatsapp_notifications (consortium_id, created_at DESC);
