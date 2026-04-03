-- Migration 016: Visitor Pre-Authorization

create table if not exists authorized_visitors (
  id              uuid primary key default gen_random_uuid(),
  consortium_id   uuid,
  user_id         uuid references auth.users(id),
  visitor_name    text not null,
  visitor_type    text check (visitor_type in ('Visita','Delivery','Empleada','Técnico','Otro')),
  valid_from      date default current_date,
  valid_until     date,
  time_from       time,
  time_to         time,
  checked_in_at   timestamptz,
  checked_in_by   uuid references auth.users(id),
  note            text,
  created_at      timestamptz default now()
);

alter table authorized_visitors enable row level security;

create policy "users manage own authorizations" on authorized_visitors
  for all using (
    user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

alter publication supabase_realtime add table authorized_visitors;
