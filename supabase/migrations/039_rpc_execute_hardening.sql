-- Endurecimiento: las RPC de escritura no deben ser invocables por anon.
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
REVOKE EXECUTE ON FUNCTION public.create_consortium_and_become_admin(text,text,text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.create_consortium_and_become_admin(text,text,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_board_reactions(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.increment_board_reactions(uuid) TO authenticated;
