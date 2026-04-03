-- Migration 014: Community Classifieds Board (Tablón)

create table if not exists board_posts (
  id              uuid primary key default gen_random_uuid(),
  consortium_id   uuid,
  user_id         uuid references auth.users(id),
  title           text not null,
  body            text,
  category        text check (category in ('Venta','Búsqueda','Perdido/Encontrado','Servicios','Donación','Otro')),
  image_url       text,
  expires_at      timestamptz default (now() + interval '30 days'),
  reactions_count int default 0,
  created_at      timestamptz default now()
);

alter table board_posts enable row level security;

create policy "all residents see active posts" on board_posts
  for select using (expires_at > now());

create policy "residents create posts" on board_posts
  for insert with check (auth.uid() = user_id);

create policy "owners delete own posts" on board_posts
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "anyone update reactions" on board_posts
  for update using (true)
  with check (true);

-- Helper function to safely increment reactions
create or replace function increment_board_reactions(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update board_posts
  set reactions_count = coalesce(reactions_count, 0) + 1
  where id = post_id;
end;
$$;
