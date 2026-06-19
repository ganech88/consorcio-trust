-- 059 · Invitaciones por unidad.
-- El admin genera un código atado a una unidad + rol (propietario/inquilino).
-- Al usarlo, la persona queda automáticamente vinculada a esa unidad.
-- El código global de consortia.invite_code sigue andando como respaldo.

CREATE TABLE IF NOT EXISTS public.consortium_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consortium_id uuid NOT NULL REFERENCES public.consortia(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'resident' CHECK (role IN ('owner','resident')),
  code text NOT NULL UNIQUE,
  full_name text,
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consortium_invites_consortium ON public.consortium_invites(consortium_id);

ALTER TABLE public.consortium_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manages unit invites" ON public.consortium_invites;
CREATE POLICY "admin manages unit invites" ON public.consortium_invites
  FOR ALL TO public
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- RPC: el admin genera una invitación (código único) para una unidad + rol.
CREATE OR REPLACE FUNCTION public.create_unit_invite(
  p_consortium_id uuid, p_unit_id uuid, p_role text, p_full_name text DEFAULT NULL
) RETURNS TABLE(invite_id uuid, code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_code text;
  v_id uuid;
BEGIN
  IF NOT (public.is_consortium_admin(p_consortium_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Solo el administrador del consorcio puede generar invitaciones.';
  END IF;
  IF p_role NOT IN ('owner','resident') THEN
    RAISE EXCEPTION 'Rol inválido: %', p_role;
  END IF;
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.consortium_invites ci WHERE ci.code = v_code)
          AND NOT EXISTS (SELECT 1 FROM public.consortia c WHERE c.invite_code = v_code);
  END LOOP;
  INSERT INTO public.consortium_invites(consortium_id, unit_id, role, code, full_name, created_by)
  VALUES (p_consortium_id, p_unit_id, p_role, v_code, NULLIF(p_full_name, ''), auth.uid())
  RETURNING id INTO v_id;
  invite_id := v_id; code := v_code; RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.create_unit_invite(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_unit_invite(uuid, uuid, text, text) TO authenticated;

-- Actualiza el join: primero busca un invite por unidad (sin usar); si no, cae
-- al código global del consorcio. (units.* calificado para evitar ambigüedad.)
CREATE OR REPLACE FUNCTION public.join_consortium_by_code(p_code text)
RETURNS TABLE(consortium_id uuid, consortium_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_code text := btrim(coalesce(p_code, ''));
  v_inv public.consortium_invites%ROWTYPE;
  v_cid uuid; v_cname text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'Código de invitación inválido. Verificá el código e intentá de nuevo.';
  END IF;

  SELECT p.consortium_id INTO v_existing FROM public.profiles p WHERE p.id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Ya pertenecés a un consorcio. Pedile a la administración el cambio si corresponde.';
  END IF;

  PERFORM set_config('app.allow_role_change', 'on', true);

  SELECT * INTO v_inv
  FROM public.consortium_invites
  WHERE upper(code) = upper(v_code) AND used_at IS NULL
  ORDER BY (code = v_code) DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
       SET role = v_inv.role, consortium_id = v_inv.consortium_id, unit_id = v_inv.unit_id
     WHERE id = v_uid;
    IF v_inv.unit_id IS NOT NULL THEN
      IF v_inv.role = 'owner' THEN
        UPDATE public.units SET owner_id = v_uid
         WHERE units.id = v_inv.unit_id AND units.consortium_id = v_inv.consortium_id;
      ELSE
        UPDATE public.units SET tenant_id = v_uid
         WHERE units.id = v_inv.unit_id AND units.consortium_id = v_inv.consortium_id;
      END IF;
    END IF;
    UPDATE public.consortium_invites SET used_by = v_uid, used_at = now() WHERE id = v_inv.id;
    SELECT name INTO v_cname FROM public.consortia WHERE id = v_inv.consortium_id;
    consortium_id := v_inv.consortium_id; consortium_name := v_cname; RETURN NEXT; RETURN;
  END IF;

  SELECT c.id, c.name INTO v_cid, v_cname
  FROM public.consortia c
  WHERE upper(c.invite_code) = upper(v_code)
  ORDER BY (c.invite_code = v_code) DESC
  LIMIT 1;

  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido. Verificá el código e intentá de nuevo.';
  END IF;

  UPDATE public.profiles SET consortium_id = v_cid WHERE id = v_uid;
  consortium_id := v_cid; consortium_name := v_cname; RETURN NEXT;
END;
$$;
