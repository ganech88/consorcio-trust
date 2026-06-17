-- ============================================================
-- Permisos de admin (auditoria 2026-06-14)
-- Aplicada al proyecto kldgbgxycmvywvvftuvi via MCP.
-- Habilita el modelo: super_admin asigna admins; admin gestiona
-- SU consorcio (asigna owner/resident, crea unidades) sin poder
-- crear admin/super_admin ni tocar otros consorcios.
-- ============================================================

-- Helper: ¿el usuario actual es admin (o super_admin) del consorcio dado?
CREATE OR REPLACE FUNCTION public.is_consortium_admin(cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','super_admin') AND consortium_id = cid
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_consortium_admin(uuid) TO authenticated;

-- Trigger anti-escalada v2: super_admin todo; admin solo owner/resident en su
-- consorcio; admin/super_admin solo los asigna un super_admin.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- contexto confiable (RPC de onboarding) marcado por set_config
    IF coalesce(current_setting('app.allow_role_change', true), '') = 'on' THEN
      RETURN NEW;
    END IF;
    IF public.is_super_admin() THEN
      RETURN NEW;
    END IF;
    IF NEW.role IN ('admin','super_admin') THEN
      RAISE EXCEPTION 'No autorizado: solo un super_admin puede asignar el rol %', NEW.role;
    END IF;
    IF NOT public.is_consortium_admin(OLD.consortium_id) THEN
      RAISE EXCEPTION 'No autorizado a cambiar el rol';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- profiles: un admin puede actualizar perfiles de miembros de SU consorcio
DROP POLICY IF EXISTS "admin update consortium members" ON public.profiles;
CREATE POLICY "admin update consortium members" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_consortium_admin(consortium_id))
  WITH CHECK (public.is_consortium_admin(consortium_id));

-- units: el admin gestiona las unidades de su consorcio; los miembros las leen
DROP POLICY IF EXISTS "units_member_select" ON public.units;
CREATE POLICY "units_member_select" ON public.units
  FOR SELECT TO authenticated
  USING (
    consortium_id = public.current_consortium_id()
    OR public.is_consortium_admin(consortium_id)
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "units_admin_manage" ON public.units;
CREATE POLICY "units_admin_manage" ON public.units
  FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- RPC: onboarding self-service (crear consorcio y quedar como su admin) de forma segura
CREATE OR REPLACE FUNCTION public.create_consortium_and_become_admin(
  p_name text, p_address text DEFAULT '', p_city text DEFAULT NULL
) RETURNS public.consortia
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c public.consortia; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  INSERT INTO public.consortia(name, address, city, invite_code)
    VALUES (p_name, coalesce(p_address,''), p_city, upper(substr(md5(random()::text),1,6)))
    RETURNING * INTO c;
  PERFORM set_config('app.allow_role_change','on', true);
  UPDATE public.profiles SET consortium_id = c.id, role = 'admin' WHERE id = uid;
  INSERT INTO public.admin_consortia(admin_id, consortium_id, granted_by)
    VALUES (uid, c.id, uid) ON CONFLICT (admin_id, consortium_id) DO NOTHING;
  RETURN c;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_consortium_and_become_admin(text,text,text) TO authenticated;
