-- ============================================================
-- 056 · RPC para que el admin agregue un residente/propietario (via MCP)
-- Eleva/setea a un usuario como owner|resident de un consorcio y lo
-- vincula a su unidad (owner_id/tenant_id). SECURITY DEFINER y SOLO
-- invocable por service_role (la edge function provision-consortium-member
-- la llama tras validar que quien pide es admin del consorcio o super_admin).
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_member(
  p_user_id uuid, p_consortium_id uuid, p_unit_id uuid, p_role text, p_full_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_role NOT IN ('owner', 'resident') THEN
    RAISE EXCEPTION 'Rol invalido: %', p_role;
  END IF;
  PERFORM set_config('app.allow_role_change', 'on', true);
  UPDATE public.profiles
     SET role = p_role,
         consortium_id = p_consortium_id,
         unit_id = p_unit_id,
         full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
   WHERE id = p_user_id;
  IF p_unit_id IS NOT NULL THEN
    IF p_role = 'owner' THEN
      UPDATE public.units SET owner_id = p_user_id
       WHERE id = p_unit_id AND consortium_id = p_consortium_id;
    ELSE
      UPDATE public.units SET tenant_id = p_user_id
       WHERE id = p_unit_id AND consortium_id = p_consortium_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_member(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_member(uuid, uuid, uuid, text, text) TO service_role;
