-- Proveedores y órdenes de pago
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  cuit text,
  category text,
  phone text,
  email text,
  address text,
  bank_info text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  invoice_number text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  due_date date,
  paid_at timestamptz,
  paid_by uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage suppliers" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND consortium_id = suppliers.consortium_id)
  );

CREATE POLICY "admin manage payment_orders" ON payment_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND consortium_id = payment_orders.consortium_id)
  );

CREATE INDEX IF NOT EXISTS suppliers_consortium_idx ON suppliers(consortium_id);
CREATE INDEX IF NOT EXISTS po_consortium_idx ON payment_orders(consortium_id);
CREATE INDEX IF NOT EXISTS po_supplier_idx ON payment_orders(supplier_id);
CREATE INDEX IF NOT EXISTS po_status_idx ON payment_orders(status);
