-- ============================================================
-- Migracion correctiva de seguridad RLS (auditoria 2026-06-14)
-- Cierra policies permisivas USING(true), fuga de PII entre
-- consorcios y bloquea auto-escalada de rol.
-- Base sin datos (pre-lanzamiento): aplicacion segura.
-- Aplicada al proyecto kldgbgxycmvywvvftuvi via MCP.
-- ============================================================

-- Helper: consorcio del usuario actual sin gatillar RLS (evita recursion)
CREATE OR REPLACE FUNCTION public.current_consortium_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT consortium_id FROM public.profiles WHERE id = auth.uid() $$;

-- 1) PROFILES: bloquear auto-escalada de rol (solo super_admin cambia 'role')
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado: solo un super_admin puede cambiar el rol.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- PROFILES SELECT: limitar a uno mismo + su consorcio + super_admin
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR consortium_id = public.current_consortium_id()
  );

-- 2) CLAIMS: eliminar catch-all ALL USING(true)/CHECK(true)
DROP POLICY IF EXISTS "Permitir todo a todos" ON public.claims;

-- 3) ANNOUNCEMENTS: eliminar SELECT permisivo (queda la version scopeada)
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;

-- 4) CONTACTS
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
CREATE POLICY "contacts_select_scoped" ON public.contacts
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id());

-- 5) EVENTS
DROP POLICY IF EXISTS "events_read_all" ON public.events;
CREATE POLICY "events_select_scoped" ON public.events
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id());

-- 6) EXPENSE_PERIODS
DROP POLICY IF EXISTS "expense_periods_read_all" ON public.expense_periods;
CREATE POLICY "expense_periods_select_scoped" ON public.expense_periods
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id());

-- 7) EXPENSES_LOG
DROP POLICY IF EXISTS "expenses_log_read_all" ON public.expenses_log;
CREATE POLICY "expenses_log_select_scoped" ON public.expenses_log
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id());

-- 8) POLLS
DROP POLICY IF EXISTS "polls_read_all" ON public.polls;
CREATE POLICY "polls_select_scoped" ON public.polls
  FOR SELECT TO authenticated
  USING (consortium_id = public.current_consortium_id());

-- 9) POLL_VOTES (scope via consorcio del poll, o votos propios)
DROP POLICY IF EXISTS "poll_votes_read_all" ON public.poll_votes;
CREATE POLICY "poll_votes_select_scoped" ON public.poll_votes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.polls pl
      WHERE pl.id = poll_votes.poll_id
        AND pl.consortium_id = public.current_consortium_id()
    )
  );

-- 10) BOARD_POSTS: quitar UPDATE abierto; editar solo post propio (reacciones via RPC)
DROP POLICY IF EXISTS "anyone update reactions" ON public.board_posts;
CREATE POLICY "board_posts_update_own" ON public.board_posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11) MESSAGES: quitar UPDATE abierto; marcar leido solo en conversaciones propias o admin del consorcio
DROP POLICY IF EXISTS "messages_update_read_at" ON public.messages;
CREATE POLICY "messages_update_scoped" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin','super_admin')
              AND p.consortium_id = c.consortium_id
          )
        )
    )
  );

-- 12) PAYMENTS: insertar solo pagos propios
DROP POLICY IF EXISTS "Permitir insertar pagos a todos" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
