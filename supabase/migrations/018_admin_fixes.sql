-- ============================================================
-- Migración 018: Fixes completos del panel de admin
-- Crea tablas faltantes, corrige constraints y agrega RLS
-- ============================================================

-- ─── 1. Tabla expense_items (para gráfico de expensas del dashboard) ──────────
-- Esta tabla es referenciada por fetchExpenses() y createExpense()

CREATE TABLE IF NOT EXISTS expense_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL,
  amount        numeric(12,2) NOT NULL,
  consortium_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expense_items' AND policyname = 'expense_items_select_all'
  ) THEN
    CREATE POLICY "expense_items_select_all" ON expense_items
      FOR SELECT TO authenticated USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expense_items' AND policyname = 'expense_items_insert_admin'
  ) THEN
    CREATE POLICY "expense_items_insert_admin" ON expense_items
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS expense_items_consortium_idx ON expense_items(consortium_id);

-- ─── 2. Tabla payments (para subir comprobantes) ──────────────────────────────
-- Referenciada por savePaymentRecord() y fetchPayments()

CREATE TABLE IF NOT EXISTS payments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id    text,
  amount     numeric(12,2) NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  proof_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_select_own'
  ) THEN
    CREATE POLICY "payments_select_own" ON payments
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_insert_own'
  ) THEN
    CREATE POLICY "payments_insert_own" ON payments
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_update_admin'
  ) THEN
    CREATE POLICY "payments_update_admin" ON payments
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_created_idx ON payments(created_at DESC);

-- ─── 3. Corregir constraint de role en profiles ───────────────────────────────
-- Migration 006 solo permite 'user' y 'admin', pero el panel admin
-- intenta asignar 'resident' y 'owner'. Ampliar el CHECK.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'resident', 'owner'));

-- ─── 4. RLS en profiles: admin puede leer todos los perfiles del consorcio ────
-- fetchAllProfiles() y handleDistribute() necesitan leer todos los perfiles

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_self_or_admin'
  ) THEN
    CREATE POLICY "profiles_select_self_or_admin" ON profiles
      FOR SELECT TO authenticated
      USING (
        id = auth.uid()
        OR
        (
          consortium_id IS NOT NULL
          AND consortium_id = (SELECT consortium_id FROM profiles WHERE id = auth.uid() LIMIT 1)
          AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
      );
  END IF;
END;
$$;

-- Admin puede actualizar roles de otros usuarios (updateProfileRole)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_admin'
  ) THEN
    CREATE POLICY "profiles_update_admin" ON profiles
      FOR UPDATE TO authenticated
      USING (
        id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

-- ─── 5. RLS en reservations: admin puede leer TODAS las reservas ──────────────
-- fetchAllReservations() necesita leer reservas de todos los usuarios
-- Migration 002 solo pone "users see own", migration 006 agrega UPDATE admin
-- pero falta SELECT para admin.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_select_admin'
  ) THEN
    CREATE POLICY "reservations_select_admin" ON reservations
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

-- ─── 6. Asegurarse que expense_period_items admin puede leer todos ─────────────
-- La policy "expense_period_items_read_own" solo permite ver los propios.
-- La policy "expense_period_items_admin_all" (migration 007) cubre SELECT
-- para admin, pero si hay conflicto con IF NOT EXISTS en 007, puede faltar.
-- Re-crear con nombre distinto para asegurar existencia.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'expense_period_items' AND policyname = 'period_items_admin_select'
  ) THEN
    CREATE POLICY "period_items_admin_select" ON expense_period_items
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

-- ─── 7. Asegurar bucket de documentos ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'documents_admin_upload'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "documents_admin_upload"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'documents_public_read'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "documents_public_read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'documents');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'documents_admin_delete'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "documents_admin_delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'documents'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;
