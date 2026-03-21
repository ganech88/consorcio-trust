-- Migration 015: Maintenance Calendar

create table if not exists maintenance_tasks (
  id              uuid primary key default gen_random_uuid(),
  consortium_id   uuid,
  name            text not null,
  category        text,
  recurrence      text check (recurrence in ('weekly','monthly','quarterly','biannual','annual')),
  next_due        date,
  last_completed  date,
  estimated_cost  numeric,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

alter table maintenance_tasks enable row level security;

create policy "residents read tasks" on maintenance_tasks
  for select using (true);

create policy "admin manage tasks" on maintenance_tasks
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
