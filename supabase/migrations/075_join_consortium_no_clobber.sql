-- 075: la invitación por unidad ya no pisa al ocupante anterior en silencio:
-- limpia el profiles.unit_id del desplazado para no dejar estado inconsistente.
CREATE OR REPLACE FUNCTION public.join_consortium_by_code(p_code text)
 RETURNS TABLE(consortium_id uuid, consortium_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_code text := btrim(coalesce(p_code, ''));
  v_inv public.consortium_invites%ROWTYPE;
  v_cid uuid; v_cname text;
  v_prev uuid;
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
        SELECT owner_id INTO v_prev FROM public.units WHERE id = v_inv.unit_id;
        IF v_prev IS NOT NULL AND v_prev <> v_uid THEN
          UPDATE public.profiles SET unit_id = NULL WHERE id = v_prev AND unit_id = v_inv.unit_id;
        END IF;
        UPDATE public.units SET owner_id = v_uid
         WHERE units.id = v_inv.unit_id AND units.consortium_id = v_inv.consortium_id;
      ELSE
        SELECT tenant_id INTO v_prev FROM public.units WHERE id = v_inv.unit_id;
        IF v_prev IS NOT NULL AND v_prev <> v_uid THEN
          UPDATE public.profiles SET unit_id = NULL WHERE id = v_prev AND unit_id = v_inv.unit_id;
        END IF;
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
$function$;
