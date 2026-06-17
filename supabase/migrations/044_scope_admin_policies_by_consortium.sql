-- ============================================================
-- Acotar por consorcio las policies de admin que validaban solo role='admin'
-- global. Un admin ahora solo opera sobre SU consorcio; super_admin sigue global.
-- Aplicada a kldgbgxycmvywvvftuvi via MCP.
-- ============================================================

-- 1) ANNOUNCEMENTS
DROP POLICY IF EXISTS "announcements_insert_admin" ON public.announcements;
CREATE POLICY "announcements_insert_admin" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "announcements_update_admin" ON public.announcements;
CREATE POLICY "announcements_update_admin" ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "announcements_delete_admin" ON public.announcements;
CREATE POLICY "announcements_delete_admin" ON public.announcements FOR DELETE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 2) CONTACTS
DROP POLICY IF EXISTS "contacts_insert_admin" ON public.contacts;
CREATE POLICY "contacts_insert_admin" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "contacts_update_admin" ON public.contacts;
CREATE POLICY "contacts_update_admin" ON public.contacts FOR UPDATE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "contacts_delete_admin" ON public.contacts;
CREATE POLICY "contacts_delete_admin" ON public.contacts FOR DELETE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 3) EVENTS
DROP POLICY IF EXISTS "events_admin_write" ON public.events;
CREATE POLICY "events_admin_write" ON public.events FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 4) EXPENSE_PERIODS
DROP POLICY IF EXISTS "expense_periods_admin_insert" ON public.expense_periods;
CREATE POLICY "expense_periods_admin_insert" ON public.expense_periods FOR INSERT TO authenticated
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 5) EXPENSES_LOG
DROP POLICY IF EXISTS "expenses_log_admin_write" ON public.expenses_log;
CREATE POLICY "expenses_log_admin_write" ON public.expenses_log FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 6) POLLS
DROP POLICY IF EXISTS "polls_admin_write" ON public.polls;
CREATE POLICY "polls_admin_write" ON public.polls FOR ALL TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 7) RESERVATIONS (update admin)
DROP POLICY IF EXISTS "reservations_update_admin" ON public.reservations;
CREATE POLICY "reservations_update_admin" ON public.reservations FOR UPDATE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 8) CLAIMS
DROP POLICY IF EXISTS "claims_select_admin" ON public.claims;
CREATE POLICY "claims_select_admin" ON public.claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "claims_update_admin" ON public.claims;
CREATE POLICY "claims_update_admin" ON public.claims FOR UPDATE TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin())
  WITH CHECK (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 9) BOARD_POSTS (delete)
DROP POLICY IF EXISTS "consortium board delete" ON public.board_posts;
CREATE POLICY "consortium board delete" ON public.board_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 10) CONVERSATIONS
DROP POLICY IF EXISTS "conversations_read_own" ON public.conversations;
CREATE POLICY "conversations_read_own" ON public.conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 11) DEBT_REMINDERS_LOG
DROP POLICY IF EXISTS "admin read reminders_log" ON public.debt_reminders_log;
CREATE POLICY "admin read reminders_log" ON public.debt_reminders_log FOR SELECT TO authenticated
  USING (public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 12) VISITORS
DROP POLICY IF EXISTS "visitors_read_own" ON public.visitors;
CREATE POLICY "visitors_read_own" ON public.visitors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "visitors_update_own" ON public.visitors;
CREATE POLICY "visitors_update_own" ON public.visitors FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "visitors_delete_own" ON public.visitors;
CREATE POLICY "visitors_delete_own" ON public.visitors FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 13) PACKAGES (update)
DROP POLICY IF EXISTS "consortium packages update" ON public.packages;
CREATE POLICY "consortium packages update" ON public.packages FOR UPDATE TO authenticated
  USING (unit_user_id = auth.uid() OR public.is_consortium_admin(consortium_id) OR public.is_super_admin());

-- 14) ANNOUNCEMENT_READS (scope via announcement -> consortium)
DROP POLICY IF EXISTS "admin read all reads" ON public.announcement_reads;
CREATE POLICY "admin read all reads" ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_reads.announcement_id
      AND (public.is_consortium_admin(a.consortium_id) OR public.is_super_admin())
  ));

-- 15) EXPENSE_PERIOD_ITEMS (scope via period -> consortium)
DROP POLICY IF EXISTS "expense_period_items_admin_all" ON public.expense_period_items;
CREATE POLICY "expense_period_items_admin_all" ON public.expense_period_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.expense_periods p
    WHERE p.id = expense_period_items.period_id
      AND (public.is_consortium_admin(p.consortium_id) OR public.is_super_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expense_periods p
    WHERE p.id = expense_period_items.period_id
      AND (public.is_consortium_admin(p.consortium_id) OR public.is_super_admin())
  ));

-- 16) MESSAGES (scope admin branch via conversation -> consortium)
DROP POLICY IF EXISTS "messages_read" ON public.messages;
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user_id = auth.uid() OR public.is_consortium_admin(c.consortium_id) OR public.is_super_admin())
  ));
