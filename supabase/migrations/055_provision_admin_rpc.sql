-- ============================================================
-- 055 · RPC para que el super_admin "cree" un administrador (via MCP)
-- Eleva a un usuario (ya existente en auth) a admin de un consorcio:
-- role='admin' + consortium_id + admin_consortia. SECURITY DEFINER y
-- SOLO invocable por service_role (la edge function provision-consortium-admin
-- la llama tras verificar que el solicitante es super_admin).
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_admin(
  p_user_id uuid, p_consortium_id uuid, p_full_name text, p_granted_by uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM set_config('app.allow_role_change', 'on', true);
  UPDATE public.profiles
     SET role = 'admin',
         consortium_id = p_consortium_id,
         full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
   WHERE id = p_user_id;
  INSERT INTO public.admin_consortia(admin_id, consortium_id, granted_by)
    VALUES (p_user_id, p_consortium_id, p_granted_by)
    ON CONFLICT (admin_id, consortium_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_admin(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_admin(uuid, uuid, text, uuid) TO service_role;
