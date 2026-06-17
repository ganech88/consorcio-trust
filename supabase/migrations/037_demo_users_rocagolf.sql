-- ============================================================
-- SOLO DEMO — Usuarios de prueba para Roca Golf (password: Demo1234!)
-- Aplicada a kldgbgxycmvywvvftuvi via MCP. Borrar antes de un
-- reset de produccion real si no se quieren usuarios demo.
-- ============================================================
DO $$
DECLARE
  v_cid uuid := 'd1990519-76e8-4312-be36-3a931c90972b';
  v_pw  text := 'Demo1234!';
  v_admin uuid := gen_random_uuid();
  v_own1  uuid := gen_random_uuid();
  v_own2  uuid := gen_random_uuid();
  v_ten1  uuid := gen_random_uuid();
  v_u1 uuid := gen_random_uuid();
  v_u2 uuid := gen_random_uuid();
  v_u3 uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('app.allow_role_change','on', true);

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
   ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated','authenticated','admin.rocagolf@demo.consorciotrust.app', crypt(v_pw, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Carlos Administrador'), now(), now()),
   ('00000000-0000-0000-0000-000000000000', v_own1,  'authenticated','authenticated','propietario1@demo.consorciotrust.app',  crypt(v_pw, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Marta Propietaria'), now(), now()),
   ('00000000-0000-0000-0000-000000000000', v_own2,  'authenticated','authenticated','propietario2@demo.consorciotrust.app',  crypt(v_pw, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Jorge Inversor'), now(), now()),
   ('00000000-0000-0000-0000-000000000000', v_ten1,  'authenticated','authenticated','inquilino1@demo.consorciotrust.app',    crypt(v_pw, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name','Lucia Inquilina'), now(), now());

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES
   (v_admin::text, v_admin, jsonb_build_object('sub',v_admin::text,'email','admin.rocagolf@demo.consorciotrust.app','email_verified',true), 'email', now(), now()),
   (v_own1::text,  v_own1,  jsonb_build_object('sub',v_own1::text, 'email','propietario1@demo.consorciotrust.app','email_verified',true), 'email', now(), now()),
   (v_own2::text,  v_own2,  jsonb_build_object('sub',v_own2::text, 'email','propietario2@demo.consorciotrust.app','email_verified',true), 'email', now(), now()),
   (v_ten1::text,  v_ten1,  jsonb_build_object('sub',v_ten1::text, 'email','inquilino1@demo.consorciotrust.app','email_verified',true), 'email', now(), now());

  -- GoTrue falla el login si estas columnas quedan en NULL: ponerlas en 
  UPDATE auth.users SET confirmation_token='', recovery_token='', email_change='', email_change_token_new=''
   WHERE id IN (v_admin, v_own1, v_own2, v_ten1);

  -- Unidades primero (profiles.unit_id es FK uuid a units)
  INSERT INTO public.units (id, consortium_id, name, floor, apartment, balance, owner_id, tenant_id)
  VALUES
   (v_u1, v_cid, '1A', '1', 'A', 0,     v_own1, NULL),
   (v_u2, v_cid, '2B', '2', 'B', 48500, v_own2, v_ten1),
   (v_u3, v_cid, '3C', '3', 'C', 0,     v_own1, NULL);

  -- Perfiles (los crea handle_new_user); set rol/consorcio/unidad
  UPDATE public.profiles SET role='admin',    consortium_id=v_cid, full_name='Carlos Administrador', email='admin.rocagolf@demo.consorciotrust.app', phone='+54 9 11 5550-1000', unit_id=NULL  WHERE id=v_admin;
  UPDATE public.profiles SET role='owner',    consortium_id=v_cid, full_name='Marta Propietaria',    email='propietario1@demo.consorciotrust.app', phone='+54 9 11 5550-1001', unit_id=v_u1 WHERE id=v_own1;
  UPDATE public.profiles SET role='owner',    consortium_id=v_cid, full_name='Jorge Inversor',       email='propietario2@demo.consorciotrust.app', phone='+54 9 11 5550-1002', unit_id=v_u2 WHERE id=v_own2;
  UPDATE public.profiles SET role='resident', consortium_id=v_cid, full_name='Lucia Inquilina',      email='inquilino1@demo.consorciotrust.app',   phone='+54 9 11 5550-1003', unit_id=v_u2 WHERE id=v_ten1;

  INSERT INTO public.admin_consortia(admin_id, consortium_id, granted_by)
  VALUES (v_admin, v_cid, v_admin) ON CONFLICT (admin_id, consortium_id) DO NOTHING;
END $$;
