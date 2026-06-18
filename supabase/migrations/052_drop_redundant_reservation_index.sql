-- ============================================================
-- 052 · Quitar indice redundante/incorrecto de reservas (via MCP)
-- Contexto: 051 (one-off) agrego uniq_active_reservation SIN
-- consortium_id, que bloquearia el mismo amenity entre consorcios
-- distintos. La proteccion correcta YA existe como UNIQUE constraint
-- reservations_no_double_booking (consortium_id, amenity_id, date, time_slot),
-- que es la que impide la doble reserva dentro de cada consorcio.
-- ============================================================
DROP INDEX IF EXISTS public.uniq_active_reservation;
