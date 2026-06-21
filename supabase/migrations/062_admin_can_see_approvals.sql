-- 062 · El admin necesita VER lo que tiene que aprobar.
-- reservations: tenía policy de UPDATE para admin pero NO de SELECT, así que el
-- admin no veía las reservas ajenas (solo las propias). Agregamos SELECT.
DROP POLICY IF EXISTS reservations_select_admin ON public.reservations;
CREATE POLICY reservations_select_admin ON public.reservations
  FOR SELECT TO public
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- payments: el residente informa pagos en la tabla payments, pero el admin no
-- tenía SELECT ni UPDATE (payments no tiene consortium_id; se scopea por la
-- unidad -> consorcio). Agregamos ambas para que pueda ver y aprobar/rechazar.
DROP POLICY IF EXISTS payments_select_admin ON public.payments;
CREATE POLICY payments_select_admin ON public.payments
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = payments.unit_id
      AND (public.is_consortium_admin(u.consortium_id) OR public.is_super_admin())
  ));

DROP POLICY IF EXISTS payments_update_admin ON public.payments;
CREATE POLICY payments_update_admin ON public.payments
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = payments.unit_id
      AND (public.is_consortium_admin(u.consortium_id) OR public.is_super_admin())
  ));
