-- Correcciones de base de datos detectadas en auditoría

-- 1. consortia.address puede ser vacío (era NOT NULL sin default)
ALTER TABLE consortia ALTER COLUMN address DROP NOT NULL;

-- 2. Normalizar profiles.role default a 'resident'
UPDATE profiles SET role = 'resident' WHERE role NOT IN ('resident','admin','owner','super_admin');
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'resident';

-- 3. Agregar columna email a profiles y sincronizar desde auth.users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

-- Trigger para mantener email sincronizado al crear/actualizar usuario en auth
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- 4. Policies super_admin en consortia
DROP POLICY IF EXISTS "super_admin read all consortia" ON consortia;
DROP POLICY IF EXISTS "super_admin manage all consortia" ON consortia;
DROP POLICY IF EXISTS "super_admin write all consortia" ON consortia;
CREATE POLICY "super_admin read all consortia" ON consortia
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "super_admin write all consortia" ON consortia
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 5. Policy super_admin en profiles
DROP POLICY IF EXISTS "super_admin manage all profiles" ON profiles;
CREATE POLICY "super_admin manage all profiles" ON profiles
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- 6. Habilitar RLS en tablas que lo tenían deshabilitado
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read amenities" ON amenities
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND consortium_id = amenities.consortium_id));
CREATE POLICY "admin manage amenities" ON amenities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND consortium_id = amenities.consortium_id));
CREATE POLICY "members read bookings" ON bookings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin manage bookings" ON bookings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "members read expense_items" ON expense_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin manage expense_items" ON expense_items
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
