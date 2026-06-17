-- bookings es una tabla legacy sin uso en el código y sin consortium_id.
-- Se elimina el acceso de admin global; queda solo super_admin (sin superficie cross-consorcio).
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
DROP POLICY IF EXISTS "admin manage bookings" ON public.bookings;
CREATE POLICY "bookings_superadmin_manage" ON public.bookings FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
