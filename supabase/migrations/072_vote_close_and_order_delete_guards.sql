-- 072: (a) no se puede votar una encuesta cerrada (antes solo se validaba en el cliente);
-- (b) no se puede borrar una orden de pago pagada (dejaría huérfano el egreso
-- auto-generado por el trigger payment_order_to_egreso de la 065).

CREATE OR REPLACE FUNCTION public.check_poll_open()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT ends_at FROM polls WHERE id = NEW.poll_id) <= now() THEN
    RAISE EXCEPTION 'La votación ya cerró';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_poll_open() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_poll_open ON public.poll_votes;
CREATE TRIGGER trg_check_poll_open
  BEFORE INSERT ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.check_poll_open();

CREATE OR REPLACE FUNCTION public.protect_paid_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'paid' AND auth.uid() IS NOT NULL AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'No se puede eliminar una orden pagada (tiene un egreso asociado). Anulala o contactá al super admin.';
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_paid_orders() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_paid_orders ON public.payment_orders;
CREATE TRIGGER trg_protect_paid_orders
  BEFORE DELETE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_paid_orders();
