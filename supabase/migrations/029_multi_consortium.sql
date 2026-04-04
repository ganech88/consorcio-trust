-- Multi-consorcio: super_admin + junction table admin_consortia

-- Normalizar roles legacy: 'user' → 'resident'
UPDATE profiles SET role = 'resident' WHERE role NOT IN ('resident','admin','owner','super_admin');

-- Agregar super_admin al constraint de roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('resident','admin','owner','super_admin'));

-- Junction table: un admin puede gestionar muchos consorcios
CREATE TABLE IF NOT EXISTS admin_consortia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  consortium_id uuid REFERENCES consortia(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, consortium_id)
);

ALTER TABLE admin_consortia ENABLE ROW LEVEL SECURITY;

-- Super admin puede gestionar todas las asignaciones
CREATE POLICY "super_admin manage admin_consortia" ON admin_consortia
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Cada admin puede ver sus propias asignaciones
CREATE POLICY "admin read own consortia" ON admin_consortia
  FOR SELECT USING (admin_id = auth.uid());

-- Super admin puede ver y gestionar todos los consorcios
CREATE POLICY "super_admin read all consortia" ON consortia
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin manage all consortia" ON consortia
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Super admin puede ver y gestionar todos los perfiles
CREATE POLICY "super_admin manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS ac_admin_idx ON admin_consortia(admin_id);
CREATE INDEX IF NOT EXISTS ac_consortium_idx ON admin_consortia(consortium_id);
