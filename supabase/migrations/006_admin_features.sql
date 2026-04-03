-- ============================================================
-- Migración 006: Campo role en profiles + columnas admin en claims
-- ============================================================

-- Agregar role a profiles (user | admin)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Agregar campos admin a claims
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger updated_at en claims (reutiliza la función creada en 003)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'claims_updated_at' AND tgrelid = 'claims'::regclass
  ) THEN
    CREATE TRIGGER claims_updated_at
      BEFORE UPDATE ON claims
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- RLS adicional: admin puede leer TODOS los reclamos
-- (los usuarios normales siguen viendo solo los suyos por la política existente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'claims' AND policyname = 'claims_select_admin'
  ) THEN
    CREATE POLICY "claims_select_admin"
      ON claims FOR SELECT TO authenticated
      USING (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;

-- Admin puede actualizar reclamos (cambiar estado, agregar nota)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'claims' AND policyname = 'claims_update_admin'
  ) THEN
    CREATE POLICY "claims_update_admin"
      ON claims FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;

-- Admin puede actualizar reservas (aprobar/rechazar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reservations' AND policyname = 'reservations_update_admin'
  ) THEN
    CREATE POLICY "reservations_update_admin"
      ON reservations FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;

-- Admin puede crear expense_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'expense_items' AND policyname = 'expense_items_insert_admin'
  ) THEN
    CREATE POLICY "expense_items_insert_admin"
      ON expense_items FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;
