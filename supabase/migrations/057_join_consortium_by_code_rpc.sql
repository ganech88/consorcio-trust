-- 057 · RPC para unirse a un consorcio por código de invitación.
-- Las políticas RLS de `consortia` solo permiten leer un consorcio del que ya
-- sos miembro, por lo que el flujo anterior (select directo por invite_code)
-- siempre fallaba con "Código inválido" para usuarios nuevos (huevo y gallina).
-- Este RPC corre como SECURITY DEFINER: busca el consorcio por código, valida
-- que el usuario no pertenezca ya a uno, y lo vincula. No cambia el rol, así que
-- no interfiere con el trigger prevent_role_escalation.
CREATE OR REPLACE FUNCTION public.join_consortium_by_code(p_code text)
RETURNS TABLE(consortium_id uuid, consortium_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_id uuid;
  v_name text;
  v_code text := btrim(coalesce(p_code, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'Código de invitación inválido. Verificá el código e intentá de nuevo.';
  END IF;

  SELECT p.consortium_id INTO v_existing FROM public.profiles p WHERE p.id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Ya pertenecés a un consorcio. Pedile a la administración el cambio si corresponde.';
  END IF;

  SELECT c.id, c.name INTO v_id, v_name
  FROM public.consortia c
  WHERE upper(c.invite_code) = upper(v_code)
  ORDER BY (c.invite_code = v_code) DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido. Verificá el código e intentá de nuevo.';
  END IF;

  UPDATE public.profiles SET consortium_id = v_id WHERE id = v_uid;

  consortium_id := v_id;
  consortium_name := v_name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.join_consortium_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_consortium_by_code(text) TO authenticated;
