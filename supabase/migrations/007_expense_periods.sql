-- ─── Feature 1: Sistema de expensas completo ─────────────────────────────────
-- Nota: la tabla expense_items ya existe con columnas category/amount para el
-- gráfico del dashboard. Las nuevas tablas usan nombres distintos para
-- no romper la funcionalidad existente.

-- Liquidaciones mensuales del consorcio
CREATE TABLE IF NOT EXISTS expense_periods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consortium_id uuid,
  period        text NOT NULL,           -- e.g. '2026-03'
  total_amount  numeric(12,2) NOT NULL,
  due_date      date NOT NULL,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ítems distribuidos por unidad (por período)
CREATE TABLE IF NOT EXISTS expense_period_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id  uuid REFERENCES expense_periods(id) ON DELETE CASCADE,
  unit_id    text NOT NULL,
  user_id    uuid REFERENCES auth.users(id),
  amount     numeric(12,2) NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE expense_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_period_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_periods_read_all" ON expense_periods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "expense_periods_admin_insert" ON expense_periods
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "expense_period_items_read_own" ON expense_period_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "expense_period_items_admin_all" ON expense_period_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "expense_period_items_user_update" ON expense_period_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS expense_periods_consortium_idx ON expense_periods(consortium_id);
CREATE INDEX IF NOT EXISTS expense_periods_period_idx ON expense_periods(period);
CREATE INDEX IF NOT EXISTS expense_period_items_period_idx ON expense_period_items(period_id);
CREATE INDEX IF NOT EXISTS expense_period_items_user_idx ON expense_period_items(user_id);
CREATE INDEX IF NOT EXISTS expense_period_items_unit_idx ON expense_period_items(unit_id);
