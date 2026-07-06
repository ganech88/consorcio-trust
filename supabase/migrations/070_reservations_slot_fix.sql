-- 070: un rechazo no debe bloquear el turno + disponibilidad real para residentes
-- (a) UNIQUE parcial: solo pending/approved ocupan el slot
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_double_booking;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_active_slot_unique
  ON public.reservations (consortium_id, amenity_id, date, time_slot)
  WHERE status IN ('pending', 'approved');

-- (b) Residentes ven las reservas de su consorcio (para disponibilidad real)
DROP POLICY IF EXISTS "reservations_select_consortium" ON public.reservations;
CREATE POLICY "reservations_select_consortium" ON public.reservations
  FOR SELECT TO authenticated
  USING (consortium_id = current_consortium_id());

-- (c) El usuario puede cancelar/borrar sus propias reservas (incluye aprobadas: libera
-- el turno; y rechazadas: limpia historial)
DROP POLICY IF EXISTS "Owners can cancel their pending reservations" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete_own" ON public.reservations;
CREATE POLICY "reservations_delete_own" ON public.reservations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
