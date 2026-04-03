-- Adjuntos para multas y órdenes de pago
ALTER TABLE fines ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS attachment_url text;

-- Bucket policy: admins can upload to comprobantes (bucket already exists)
-- Allow public read for comprobantes bucket objects (already configured)
