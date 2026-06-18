-- ============================================================
-- 050 · Segmentacion de comunicados (audiencia)
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
-- 'all' | 'owners' | 'residents' | 'debtors'. Es targeting de
-- visualizacion (no control de acceso); la RLS de lectura sigue
-- siendo a nivel consorcio.
-- ============================================================
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';
