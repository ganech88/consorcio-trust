-- 068 (retroactiva): revocar EXECUTE de anon en funciones SECURITY DEFINER de
-- mutación/provisioning. Aplicada a mano el 2026-07-05 vía MCP; versionada retroactivamente.
-- Los 4 helpers de RLS (current_consortium_id, is_consortium_admin, is_super_admin,
-- payment_order_to_egreso) conservan grant a PUBLIC a propósito: los usa el RLS
-- internamente y sin sesión devuelven false/null.
REVOKE EXECUTE ON FUNCTION public.assign_member_unit(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_consortium_and_become_admin(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_unit_invite(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_board_reactions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_consortium_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_admin(uuid, uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_member(uuid, uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM anon, authenticated;
