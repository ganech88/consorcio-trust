-- Migration 013: Package & Delivery Tracking
-- New packages table with richer schema (carrier, photo, collect workflow)

create table if not exists packages (
  id             uuid primary key default gen_random_uuid(),
  consortium_id  uuid,
  unit_user_id   uuid references auth.users(id),
  logged_by      uuid references auth.users(id),
  carrier        text,
  description    text,
  photo_url      text,
  status         text default 'pending' check (status in ('pending', 'collected')),
  logged_at      timestamptz default now(),
  collected_at   timestamptz,
  created_at     timestamptz default now()
);

alter table packages enable row level security;

create policy "users see own packages" on packages
  for select using (
    unit_user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin insert packages" on packages
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "users update own packages" on packages
  for update using (
    unit_user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

alter publication supabase_realtime add table packages;
