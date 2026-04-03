-- ============================================================
-- Migración 002: Crear tabla de reservas de amenities
-- ============================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor, o con supabase db push
-- Dependencias: tabla profiles, units, consortia (migración 001)
-- ============================================================


-- ============================================================
-- 1. TIPO ENUM para el estado de la reserva
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE reservation_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;


-- ============================================================
-- 2. TABLA PRINCIPAL
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (

  -- Clave primaria
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién reserva
  -- Referencia a auth.users (no a profiles) para que la FK
  -- no se rompa si el perfil todavía no fue creado.
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contexto del consorcio (para que el admin filtre por consorcio)
  consortium_id   UUID REFERENCES consortia(id) ON DELETE SET NULL,

  -- Contexto de la unidad (informativo, para mostrar en el panel admin)
  unit_id         UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Qué amenity
  -- amenity_id es el id numérico de AMENITIES_LIST (1-4)
  amenity_id      SMALLINT NOT NULL
                    CHECK (amenity_id BETWEEN 1 AND 100),  -- rango amplio para escalar
  amenity_name    TEXT NOT NULL
                    CHECK (char_length(amenity_name) BETWEEN 1 AND 100),

  -- Cuándo
  date            DATE NOT NULL
                    CHECK (date >= CURRENT_DATE),
  time_slot       TEXT NOT NULL
                    CHECK (time_slot ~ '^\d{2}:\d{2} - \d{2}:\d{2}$'),

  -- Estado de la reserva
  status          reservation_status NOT NULL DEFAULT 'pending',

  -- Nota del administrador (motivo de rechazo, aclaraciones, etc.)
  admin_note      TEXT
                    CHECK (admin_note IS NULL OR char_length(admin_note) <= 500),

  -- Auditoría
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ────────────────────────────────────────────────────────
  -- UNICIDAD: un solo usuario puede reservar la misma
  -- combinación amenity + fecha + horario (dentro del mismo
  -- consorcio). Permite que consorcios distintos compartan
  -- el mismo amenity_id sin colisión.
  -- ────────────────────────────────────────────────────────
  CONSTRAINT reservations_no_double_booking
    UNIQUE (consortium_id, amenity_id, date, time_slot)
);

COMMENT ON TABLE reservations IS
  'Reservas de amenities realizadas por los propietarios. '
  'El estado es manejado por el administrador del consorcio.';

COMMENT ON COLUMN reservations.time_slot IS
  'Franja horaria en formato "HH:MM - HH:MM", ej: "10:00 - 12:00".';

COMMENT ON COLUMN reservations.admin_note IS
  'Comentario del administrador, especialmente útil en rechazos.';


-- ============================================================
-- 3. TRIGGER: actualizar updated_at automáticamente
-- ============================================================

-- Función reutilizable (puede existir de migraciones previas)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. ÍNDICES
-- ============================================================

-- Consultas del propietario: "mis reservas"
CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON reservations (user_id);

-- Consultas del administrador: "reservas de mi consorcio"
CREATE INDEX IF NOT EXISTS idx_reservations_consortium_id
  ON reservations (consortium_id);

-- Verificar disponibilidad de un amenity en una fecha
-- (el índice cubre el UNIQUE, pero también lo explicitamos
--  para que el planner lo use en queries de disponibilidad)
CREATE INDEX IF NOT EXISTS idx_reservations_availability
  ON reservations (amenity_id, date, time_slot);

-- Filtrar por estado (ej: todas las pendientes de un consorcio)
CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON reservations (status)
  WHERE status = 'pending';  -- partial index: solo pendientes (las más consultadas)

-- Ordenar por fecha en queries del calendario
CREATE INDEX IF NOT EXISTS idx_reservations_date
  ON reservations (date DESC);


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- ── 5a. SELECT ──────────────────────────────────────────────
-- Cada usuario solo ve SUS PROPIAS reservas.
-- El service_role (admin) las ve todas (no es afectado por RLS).

DROP POLICY IF EXISTS "Owners can view their own reservations" ON reservations;
CREATE POLICY "Owners can view their own reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 5b. INSERT ──────────────────────────────────────────────
-- Un usuario autenticado puede crear reservas únicamente
-- a su propio nombre (no puede insertar con otro user_id).

DROP POLICY IF EXISTS "Owners can create their own reservations" ON reservations;
CREATE POLICY "Owners can create their own reservations"
  ON reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 5c. DELETE ──────────────────────────────────────────────
-- Un usuario solo puede CANCELAR sus propias reservas
-- mientras estén en estado 'pending'.
-- Las aprobadas o rechazadas solo el admin puede eliminarlas.

DROP POLICY IF EXISTS "Owners can cancel their pending reservations" ON reservations;
CREATE POLICY "Owners can cancel their pending reservations"
  ON reservations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- ── 5d. UPDATE ──────────────────────────────────────────────
-- Los usuarios NO pueden modificar reservas directamente.
-- El cambio de estado (pending → approved/rejected) y la
-- nota del admin son operaciones exclusivas del service_role
-- (que bypasea RLS) o de un rol de administrador futuro.
--
-- Si en el futuro querés permitir que admins del consorcio
-- aprueben/rechacen desde el cliente, descomentá y ajustá:
--
-- DROP POLICY IF EXISTS "Consortium admins can update reservations" ON reservations;
-- CREATE POLICY "Consortium admins can update reservations"
--   ON reservations
--   FOR UPDATE
--   TO authenticated
--   USING (
--     consortium_id IN (
--       SELECT consortium_id FROM profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   )
--   WITH CHECK (
--     -- Solo pueden cambiar status y admin_note, no reasignar user_id
--     user_id = OLD.user_id
--     AND consortium_id = OLD.consortium_id
--   );


-- ============================================================
-- 6. GRANT de permisos a anon y authenticated
--    (Supabase lo suele hacer automático, pero lo dejamos
--     explícito para consistencia)
-- ============================================================

GRANT SELECT, INSERT, DELETE ON reservations TO authenticated;
GRANT USAGE ON SEQUENCE reservations_id_seq TO authenticated;  -- no aplica para UUID, pero lo dejamos como guarda


-- ============================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================

-- Muestra un resumen de la tabla, índices y políticas creadas.
-- Podés correr esto por separado para confirmar.

/*
-- Tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'reservations'
ORDER BY ordinal_position;

-- Índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'reservations';

-- Políticas RLS
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reservations';
*/
