-- Migration 019: Documents and approvals
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  consortium_id uuid references consortia(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  title text not null,
  description text,
  file_url text,
  file_name text,
  doc_type text not null default 'general' check (doc_type in ('general','identity','ownership','request','complaint','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','under_review')),
  admin_notes text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table documents enable row level security;

drop policy if exists "members read own documents" on documents;
create policy "members read own documents" on documents
  for select using (
    user_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and consortium_id = documents.consortium_id and role in ('admin','owner'))
  );

drop policy if exists "members insert own documents" on documents;
create policy "members insert own documents" on documents
  for insert with check (
    user_id = auth.uid() and
    exists (select 1 from profiles where id = auth.uid() and consortium_id = documents.consortium_id)
  );

drop policy if exists "admin manage documents" on documents;
create policy "admin manage documents" on documents
  for update using (
    exists (select 1 from profiles where id = auth.uid() and consortium_id = documents.consortium_id and role in ('admin','owner'))
  );

drop policy if exists "members delete own documents" on documents;
create policy "members delete own documents" on documents
  for delete using (user_id = auth.uid());
