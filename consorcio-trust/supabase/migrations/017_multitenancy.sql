-- 1. Create consortiums table
create table if not exists consortiums (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  city        text,
  invite_code text unique default substring(gen_random_uuid()::text, 1, 8),
  created_at  timestamptz default now()
);
alter table consortiums enable row level security;
create policy "members read own consortium" on consortiums
  for select using (
    exists (select 1 from profiles where id = auth.uid() and consortium_id = consortiums.id)
  );
create policy "admin update consortium" on consortiums
  for update using (
    exists (select 1 from profiles where id = auth.uid() and consortium_id = consortiums.id and role = 'admin')
  );

-- 2. Add consortium_id to profiles (if not exists)
alter table profiles add column if not exists consortium_id uuid references consortiums(id);

-- 3. Insert a default consortium for existing data
insert into consortiums (id, name, address)
values ('00000000-0000-0000-0000-000000000001', 'Consorcio Principal', 'Dirección del edificio')
on conflict (id) do nothing;

-- 4. Assign all existing profiles to the default consortium
update profiles set consortium_id = '00000000-0000-0000-0000-000000000001' where consortium_id is null;

-- 5. Update RLS policies for key tables to enforce consortium isolation:
-- claims
drop policy if exists "Users can view own claims" on claims;
drop policy if exists "users_read_own_claims" on claims;
drop policy if exists "Users can insert own claims" on claims;
drop policy if exists "users_insert_own_claims" on claims;
create policy "consortium claims select" on claims for select using (
  user_id = auth.uid() or exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
    and p.consortium_id = (select consortium_id from profiles where id = claims.user_id limit 1)
  )
);
create policy "consortium claims insert" on claims for insert with check (
  user_id = auth.uid()
);

-- announcements
drop policy if exists "anyone_read_announcements" on announcements;
drop policy if exists "admin_insert_announcements" on announcements;
create policy "consortium announcements select" on announcements for select using (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
);
create policy "consortium announcements insert" on announcements for insert with check (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- packages
drop policy if exists "users see own packages" on packages;
drop policy if exists "admin insert packages" on packages;
drop policy if exists "users update own packages" on packages;
create policy "consortium packages select" on packages for select using (
  unit_user_id = auth.uid()
  or (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    and consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  )
);
create policy "consortium packages insert" on packages for insert with check (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "consortium packages update" on packages for update using (
  unit_user_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- board_posts
drop policy if exists "all residents see active posts" on board_posts;
drop policy if exists "residents create posts" on board_posts;
drop policy if exists "owners delete own posts" on board_posts;
create policy "consortium board select" on board_posts for select using (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  and expires_at > now()
);
create policy "consortium board insert" on board_posts for insert with check (
  auth.uid() = user_id
  and consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
);
create policy "consortium board delete" on board_posts for delete using (
  user_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- maintenance_tasks
drop policy if exists "residents read tasks" on maintenance_tasks;
drop policy if exists "admin manage tasks" on maintenance_tasks;
create policy "consortium maintenance select" on maintenance_tasks for select using (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
);
create policy "consortium maintenance all" on maintenance_tasks for all using (
  consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- authorized_visitors
drop policy if exists "users manage own authorizations" on authorized_visitors;
create policy "consortium visitors all" on authorized_visitors for all using (
  user_id = auth.uid()
  or (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    and consortium_id = (select consortium_id from profiles where id = auth.uid() limit 1)
  )
);
