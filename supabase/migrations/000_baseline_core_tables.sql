-- 000 (baseline reconstruida el 2026-07-05 desde la DB en vivo).
-- Estas tablas fueron creadas a mano antes de la migración 001 y nunca se versionaron;
-- sin este archivo, `supabase db reset` no reconstruye el proyecto.
-- NOTA: se documenta el shape ACTUAL en producción (incluye columnas que migraciones
-- posteriores agregan con ALTER). Para un replay completo desde cero, esas migraciones
-- necesitarían guards IF NOT EXISTS; la alternativa definitiva es regenerar toda la
-- carpeta con `supabase db dump`. Idempotente: no hace nada si las tablas ya existen.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  full_name text,
  unit_id uuid,
  consortium_id uuid,
  role text NOT NULL DEFAULT 'resident' CHECK (role IN ('resident','admin','owner','super_admin')),
  email text
);

CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consortium_id uuid NOT NULL,
  name text NOT NULL,
  floor text,
  apartment text,
  balance numeric DEFAULT 0.00,
  owner_id uuid REFERENCES public.profiles(id),
  tenant_id uuid REFERENCES public.profiles(id),
  coefficient numeric CHECK (coefficient IS NULL OR coefficient >= 0)
);

CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consortium_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  priority text DEFAULT 'medium',
  photo_url text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  admin_note text,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  category text
);

CREATE TABLE IF NOT EXISTS public.expenses_summary (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  consortium_id uuid NOT NULL,
  period date NOT NULL,
  total_amount numeric NOT NULL,
  status text DEFAULT 'closed',
  pdf_url text,
  due_date date
);

-- FKs circulares / hacia consortia (creada en migraciones posteriores): guardadas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_unit_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'consortia') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_consortium_id_fkey') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_consortium_id_fkey FOREIGN KEY (consortium_id) REFERENCES public.consortia(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'units_consortium_id_fkey') THEN
      ALTER TABLE public.units ADD CONSTRAINT units_consortium_id_fkey FOREIGN KEY (consortium_id) REFERENCES public.consortia(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_consortium_id_fkey') THEN
      ALTER TABLE public.claims ADD CONSTRAINT claims_consortium_id_fkey FOREIGN KEY (consortium_id) REFERENCES public.consortia(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_summary_consortium_id_fkey') THEN
      ALTER TABLE public.expenses_summary ADD CONSTRAINT expenses_summary_consortium_id_fkey FOREIGN KEY (consortium_id) REFERENCES public.consortia(id);
    END IF;
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses_summary ENABLE ROW LEVEL SECURITY;
