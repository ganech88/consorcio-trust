-- Fix: agregar columna pinned a announcements si no existe
-- La migración 003 la incluía en CREATE TABLE IF NOT EXISTS,
-- pero la tabla ya existía de una versión anterior sin esa columna.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- Fix: agregar columna category a announcements si no existe
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category TEXT;
