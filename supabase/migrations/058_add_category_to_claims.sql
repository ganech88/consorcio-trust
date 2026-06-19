-- 058 · Agrega la columna `category` a claims.
-- El formulario de reclamos envía category (Limpieza, Ruidos, etc.) y tanto el
-- residente como el admin la muestran, pero la tabla no la tenía → PostgREST
-- devolvía "Could not find the 'category' column of 'claims' in the schema cache".
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS category text;

-- Forzar recarga del schema cache de PostgREST para que el cliente la vea ya.
NOTIFY pgrst, 'reload schema';
