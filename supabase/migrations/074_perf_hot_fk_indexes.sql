-- 074: índices en FKs calientes (advisors: unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS idx_profiles_consortium ON public.profiles (consortium_id);
CREATE INDEX IF NOT EXISTS idx_profiles_unit ON public.profiles (unit_id);
CREATE INDEX IF NOT EXISTS idx_units_consortium ON public.units (consortium_id);
CREATE INDEX IF NOT EXISTS idx_units_owner ON public.units (owner_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON public.units (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit ON public.payments (unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_claims_consortium ON public.claims (consortium_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims (user_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_summary ON public.expense_items (summary_id);
CREATE INDEX IF NOT EXISTS idx_expenses_summary_consortium ON public.expenses_summary (consortium_id);
CREATE INDEX IF NOT EXISTS idx_announcements_consortium ON public.announcements (consortium_id);
CREATE INDEX IF NOT EXISTS idx_documents_consortium ON public.documents (consortium_id);
CREATE INDEX IF NOT EXISTS idx_reservations_unit ON public.reservations (unit_id);
