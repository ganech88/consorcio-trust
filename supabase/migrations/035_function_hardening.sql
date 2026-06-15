-- Endurecimiento de funciones (auditoria 2026-06-14)
-- Aplicada al proyecto kldgbgxycmvywvvftuvi via MCP.

-- 1) Fijar search_path en funciones pre-existentes (evita secuestro de search_path)
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.increment_board_reactions(uuid) SET search_path = public;
ALTER FUNCTION public.sync_profile_email() SET search_path = public;

-- 2) Las funciones de trigger no deben ser invocables por RPC (anon/authenticated).
--    Los triggers siguen ejecutandolas; solo se bloquea la llamada directa via API.
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM anon, authenticated, public;
