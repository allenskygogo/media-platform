begin;

insert into storage.buckets (id, name, public)
values ('ai-knowledge', 'ai-knowledge', false)
on conflict (id) do update
set public = false;

create table if not exists public.ai_knowledge_files (
  id uuid primary key default gen_random_uuid(),
  agent_feature_key text not null references public.ai_agents(feature_key) on delete cascade,
  storage_bucket text not null default 'ai-knowledge',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  status text not null default 'pending',
  openai_file_id text,
  vector_store_id text,
  vector_store_file_id text,
  uploaded_by uuid references auth.users(id) on delete set null,
  error_message text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_knowledge_files_status_check
    check (status in ('pending', 'processing', 'ready', 'failed', 'disabled')),
  constraint ai_knowledge_files_mime_type_check
    check (mime_type in ('application/pdf'))
);

create index if not exists ai_knowledge_files_agent_idx
  on public.ai_knowledge_files (agent_feature_key, status, created_at desc);

drop trigger if exists set_ai_knowledge_files_updated_at
  on public.ai_knowledge_files;

create trigger set_ai_knowledge_files_updated_at
before update on public.ai_knowledge_files
for each row
execute function public.set_updated_at();

alter table public.ai_knowledge_files enable row level security;

drop policy if exists "Admins can read ai knowledge files"
  on public.ai_knowledge_files;

drop policy if exists "Admins can manage ai knowledge files"
  on public.ai_knowledge_files;

create policy "Admins can read ai knowledge files"
on public.ai_knowledge_files
for select
to authenticated
using (public.is_admin());

create policy "Admins can manage ai knowledge files"
on public.ai_knowledge_files
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.ai_knowledge_files to authenticated;

drop policy if exists "Admins can read ai knowledge storage"
  on storage.objects;

drop policy if exists "Admins can upload ai knowledge storage"
  on storage.objects;

drop policy if exists "Admins can update ai knowledge storage"
  on storage.objects;

drop policy if exists "Admins can delete ai knowledge storage"
  on storage.objects;

create policy "Admins can read ai knowledge storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ai-knowledge'
  and public.is_admin()
);

create policy "Admins can upload ai knowledge storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ai-knowledge'
  and public.is_admin()
);

create policy "Admins can update ai knowledge storage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ai-knowledge'
  and public.is_admin()
)
with check (
  bucket_id = 'ai-knowledge'
  and public.is_admin()
);

create policy "Admins can delete ai knowledge storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ai-knowledge'
  and public.is_admin()
);

commit;
