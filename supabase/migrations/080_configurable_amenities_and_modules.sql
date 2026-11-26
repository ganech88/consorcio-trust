-- ============================================================
-- 080 · Espacios comunes configurables por consorcio + módulos ocultables
--
-- (a) Hasta ahora la app mostraba a TODOS los consorcios los mismos 4 espacios
--     fijos en el front (SUM/Parrilla, Piscina, Coworking, Gimnasio). Ahora cada
--     consorcio administra los suyos en `amenities` (tabla que ya existía, sin uso).
--     `reservations.amenity_id` es smallint: se vincula con `amenities.number`
--     (correlativo por consorcio), así el índice único de turnos sigue igual.
-- (b) `consortia.hidden_modules`: secciones del menú del vecino que el admin
--     decide ocultar (un edificio chico no usa Paquetería, Accesos, etc.).
-- ============================================================

-- ---------- (a) Espacios comunes ----------
ALTER TABLE public.amenities
  ADD COLUMN IF NOT EXISTS number smallint,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Numerar los espacios que ya existían.
UPDATE public.amenities a
   SET number = x.rn
  FROM (
    SELECT id, row_number() OVER (PARTITION BY consortium_id ORDER BY capacity DESC NULLS LAST, name) AS rn
      FROM public.amenities
  ) x
 WHERE x.id = a.id AND a.number IS NULL;

-- Consorcios con reservas hechas contra los espacios fijos del front: crearles el
-- espacio correspondiente (con el último nombre usado) para que no desaparezca.
INSERT INTO public.amenities (consortium_id, number, name, capacity, requires_approval)
SELECT DISTINCT ON (r.consortium_id, r.amenity_id)
       r.consortium_id, r.amenity_id, r.amenity_name, NULL, true
  FROM public.reservations r
 WHERE r.consortium_id IS NOT NULL AND r.amenity_id IS NOT NULL AND r.amenity_name IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.amenities a
      WHERE a.consortium_id = r.consortium_id AND a.number = r.amenity_id
   )
 ORDER BY r.consortium_id, r.amenity_id, r.created_at DESC;

-- El número lo asigna la base (correlativo por consorcio) si no viene.
CREATE OR REPLACE FUNCTION public.amenities_assign_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
      FROM amenities WHERE consortium_id = NEW.consortium_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.amenities_assign_number() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_amenities_assign_number ON public.amenities;
CREATE TRIGGER trg_amenities_assign_number
  BEFORE INSERT ON public.amenities
  FOR EACH ROW EXECUTE FUNCTION public.amenities_assign_number();

ALTER TABLE public.amenities ALTER COLUMN number SET NOT NULL;
ALTER TABLE public.amenities ALTER COLUMN consortium_id SET NOT NULL;
ALTER TABLE public.amenities ALTER COLUMN requires_approval SET DEFAULT true;
ALTER TABLE public.amenities DROP CONSTRAINT IF EXISTS amenities_consortium_number_key;
ALTER TABLE public.amenities ADD CONSTRAINT amenities_consortium_number_key UNIQUE (consortium_id, number);
ALTER TABLE public.amenities DROP CONSTRAINT IF EXISTS amenities_name_chk;
ALTER TABLE public.amenities ADD CONSTRAINT amenities_name_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 60);
ALTER TABLE public.amenities DROP CONSTRAINT IF EXISTS amenities_capacity_chk;
ALTER TABLE public.amenities ADD CONSTRAINT amenities_capacity_chk CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 1000);

-- RLS: el admin gestiona los espacios de SU consorcio (antes la policy miraba
-- profiles.role a mano y no cubría al super admin ni al admin multi-consorcio).
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manage amenities" ON public.amenities;
DROP POLICY IF EXISTS amenities_admin_manage ON public.amenities;
CREATE POLICY amenities_admin_manage ON public.amenities
  FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
-- ("members read amenities" se mantiene: los miembros leen los de su consorcio.)

-- ---------- (b) Módulos ocultables ----------
ALTER TABLE public.consortia
  ADD COLUMN IF NOT EXISTS hidden_modules text[] NOT NULL DEFAULT '{}';
