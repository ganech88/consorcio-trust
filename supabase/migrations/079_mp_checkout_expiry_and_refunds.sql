-- ============================================================
-- 079 · MercadoPago: vencimiento de checkouts abandonados + rechazo que no pisa
--       pagos informados. (Los reembolsos/contracargos los resuelve mp-webhook
--       pasando el pago a 'rejected'; reconcile_payment (077) ya reabre el cargo.)
--
-- (a) reopen_item_on_payment_reject: rechazar un pago reabría el item 'reported'
--     aunque el rechazado fuera un checkout MP (que nunca lo marcó 'reported') o
--     aunque quedara OTRO pago informado pendiente para el mismo item. Ahora solo
--     reabre si el rechazado es un pago informado y no queda otro pendiente.
-- (b) expire_stale_mp_checkouts(): cada "Pagar online" crea un payments 'pending'
--     antes de cobrar; si el residente abandona, queda pendiente para siempre.
--     Esta función los pasa a 'rejected' (mp_status 'expired') pasadas 48 h. Si MP
--     igual acredita después, el webhook lo encuentra por external_reference y lo
--     aprueba (rejected -> approved), así que vencer no pierde cobros.
-- (c) Cron horario si pg_cron está habilitado (si no, la edge function
--     mercadopago-create-preference la invoca de forma oportunista).
-- ============================================================

-- ---------- (a) ----------
CREATE OR REPLACE FUNCTION public.reopen_item_on_payment_reject()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' AND NEW.period_item_id IS NOT NULL
     AND NEW.payment_method IS DISTINCT FROM 'mercadopago'
     AND NOT EXISTS (
       SELECT 1 FROM payments p
        WHERE p.period_item_id = NEW.period_item_id AND p.id <> NEW.id
          AND p.status = 'pending' AND p.payment_method IS DISTINCT FROM 'mercadopago'
     )
  THEN
    UPDATE expense_period_items SET status = 'pending', reported_at = NULL
     WHERE id = NEW.period_item_id AND status = 'reported';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.reopen_item_on_payment_reject() FROM anon, authenticated, public;

-- ---------- (b) ----------
CREATE OR REPLACE FUNCTION public.expire_stale_mp_checkouts(p_max_age interval DEFAULT interval '48 hours')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE payments
     SET status = 'rejected', mp_status = 'expired',
         notes = concat_ws(' · ', notes, 'Checkout de MercadoPago vencido sin pago')
   WHERE payment_method = 'mercadopago' AND status = 'pending' AND mp_payment_id IS NULL
     AND created_at < now() - p_max_age;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
-- Solo service_role (edge functions / cron): no es una RPC para clientes.
REVOKE EXECUTE ON FUNCTION public.expire_stale_mp_checkouts(interval) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.expire_stale_mp_checkouts(interval) TO service_role;

CREATE INDEX IF NOT EXISTS idx_payments_mp_unpaid_pending
  ON public.payments (created_at)
  WHERE payment_method = 'mercadopago' AND status = 'pending' AND mp_payment_id IS NULL;

-- ---------- (c) ----------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-stale-mp-checkouts';
    PERFORM cron.schedule('expire-stale-mp-checkouts', '17 * * * *', 'SELECT public.expire_stale_mp_checkouts()');
  END IF;
END
$do$;
