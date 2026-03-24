-- Migration 019: Expenses system
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  consortium_id uuid references consortia(id) on delete cascade not null,
  title text not null,
  description text,
  amount numeric(12,2) not null,
  period text not null, -- ej: "2026-03"
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid','overdue')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  amount numeric(12,2) not null,
  paid_at timestamptz default now(),
  receipt_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text
);

alter table expenses enable row level security;
alter table expense_payments enable row level security;

drop policy if exists "members read expenses" on expenses;
create policy "members read expenses" on expenses
  for select using (
    exists (select 1 from profiles where id = auth.uid() and consortium_id = expenses.consortium_id)
  );

drop policy if exists "admin manage expenses" on expenses;
create policy "admin manage expenses" on expenses
  for all using (
    exists (select 1 from profiles where id = auth.uid() and consortium_id = expenses.consortium_id and role in ('admin','owner'))
  );

drop policy if exists "members read payments" on expense_payments;
create policy "members read payments" on expense_payments
  for select using (
    exists (select 1 from profiles p join expenses e on e.id = expense_payments.expense_id where p.id = auth.uid() and p.consortium_id = e.consortium_id)
  );

drop policy if exists "members manage own payments" on expense_payments;
create policy "members manage own payments" on expense_payments
  for all using (user_id = auth.uid());

drop policy if exists "admin manage payments" on expense_payments;
create policy "admin manage payments" on expense_payments
  for all using (
    exists (select 1 from profiles p join expenses e on e.id = expense_payments.expense_id where p.id = auth.uid() and p.consortium_id = e.consortium_id and p.role in ('admin','owner'))
  );
