-- 061 · RPC para que el admin asigne (o cambie/saque) la unidad de un miembro
-- que YA pertenece al consorcio. Libera la unidad previa, setea profiles.unit_id
-- y vincula owner_id/tenant_id segun el rol actual del miembro.
CREATE OR REPLACE FUNCTION public.assign_member_unit(p_user_id uuid, p_unit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_cons uuid;
  v_role text;
BEGIN
  SELECT consortium_id, role INTO v_cons, v_role FROM public.profiles WHERE id = p_user_id;
  IF v_cons IS NULL THEN
    RAISE EXCEPTION 'La persona no pertenece a ningún consorcio.';
  END IF;
  IF NOT (public.is_consortium_admin(v_cons) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Solo el administrador del consorcio puede asignar unidades.';
  END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.id = p_unit_id AND u.consortium_id = v_cons
  ) THEN
    RAISE EXCEPTION 'La unidad no pertenece a este consorcio.';
  END IF;

  -- liberar a la persona de cualquier unidad previa de su consorcio
  UPDATE public.units SET owner_id = NULL
    WHERE units.owner_id = p_user_id AND units.consortium_id = v_cons;
  UPDATE public.units SET tenant_id = NULL
    WHERE units.tenant_id = p_user_id AND units.consortium_id = v_cons;

  UPDATE public.profiles SET unit_id = p_unit_id WHERE id = p_user_id;

  IF p_unit_id IS NOT NULL THEN
    IF v_role = 'owner' THEN
      UPDATE public.units SET owner_id = p_user_id
        WHERE units.id = p_unit_id AND units.consortium_id = v_cons;
    ELSE
      UPDATE public.units SET tenant_id = p_user_id
        WHERE units.id = p_unit_id AND units.consortium_id = v_cons;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_member_unit(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_member_unit(uuid, uuid) TO authenticated;
