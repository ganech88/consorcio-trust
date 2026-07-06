-- 073: alinear el CHECK de payments.status con el código real ('approved', no 'verified';
-- en producción el CHECK de la 018 había sido dropeado a mano — drift) + idempotencia
-- del webhook MP (UNIQUE en mp_payment_id). Integridad de datos; no toca la lógica MP.
UPDATE public.payments SET status = 'approved' WHERE status = 'verified';
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS expense_payments_mp_payment_id_key
  ON public.expense_payments (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
