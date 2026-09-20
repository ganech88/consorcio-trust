-- 078: higiene de advisors — las funciones de trigger no deben ser ejecutables por API
-- (no se pueden invocar como RPC igual, pero cerramos el permiso) y search_path fijo en late_interest.
-- Aplicada a kldgbgxycmvywvvftuvi via MCP el 2026-09-20.
REVOKE EXECUTE ON FUNCTION public.reconcile_payment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_payments_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_item_reported_on_payment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reopen_item_on_payment_reject() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_period_items() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_paid_orders() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.payment_order_to_egreso() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_poll_open() FROM anon, authenticated, public;
ALTER FUNCTION public.late_interest(numeric, date, numeric, int, date) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.late_interest(numeric, date, numeric, int, date) FROM anon;
