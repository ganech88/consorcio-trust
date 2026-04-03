-- Integración MercadoPago
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual'
  CHECK (payment_method IN ('manual','mercadopago'));
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS mp_preference_id text;
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS mp_status text;
ALTER TABLE expense_payments ADD COLUMN IF NOT EXISTS mp_external_reference text;

CREATE TABLE IF NOT EXISTS mp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token text NOT NULL,
  public_key text,
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage mp_config" ON mp_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND consortium_id = mp_config.consortium_id)
  );

CREATE INDEX IF NOT EXISTS ep_mp_payment_id_idx ON expense_payments(mp_payment_id);
