-- Migration 018: Expenses system
-- Tables: expenses, expense_payments
-- (Already applied to DB, this file is for reference)
drop table if exists expense_payments cascade;
drop table if exists expenses cascade;
create table expenses (
  id uuid primary key default gen_random_uuid(),
  consortium_id uuid references consortia(id) on delete cascade not null,
  title text not null,
  description text,
  amount numeric(12,2) not null,
  period text not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid','overdue')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create table expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  amount numeric(12,2) not null,
  paid_at timestamptz default now(),
  receipt_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text
);
