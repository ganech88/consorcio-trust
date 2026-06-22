-- 064 · Transparencia de multas: los miembros del consorcio pueden VER las
-- multas del edificio (no solo las propias), para que aparezcan en el detalle
-- de la expensa. Cada uno paga solo la suya; las ajenas son informativas.
DROP POLICY IF EXISTS "members read consortium fines" ON public.fines;
CREATE POLICY "members read consortium fines" ON public.fines
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.consortium_id = fines.consortium_id
  ));
