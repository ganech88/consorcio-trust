-- 071: FK conversations.user_id -> profiles(id) para que PostgREST pueda embeber
-- profiles(full_name, unit_id) en fetchAllConversations (bandeja del admin).
-- Sin esta FK, el join embebido fallaba y el admin veía la bandeja siempre vacía.
DELETE FROM public.conversations c
WHERE c.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id);

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_profiles_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_consortium ON public.conversations (consortium_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations (user_id);
