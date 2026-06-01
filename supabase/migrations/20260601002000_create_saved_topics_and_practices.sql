begin;

create table if not exists public.saved_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null default 'topics',
  industry text,
  script_type text,
  element text,
  topic_text text not null,
  traffic text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_topics_feature_key_check
    check (feature_key in ('topics', 'copy', 'topic_script')),
  constraint saved_topics_script_type_check
    check (script_type is null or script_type in ('knowledge', 'opinion', 'story', 'process')),
  constraint saved_topics_traffic_check
    check (traffic is null or traffic in ('high', 'medium', 'low'))
);

create index if not exists saved_topics_user_created_idx
  on public.saved_topics (user_id, created_at desc);

create table if not exists public.topic_writing_practices (
  id uuid primary key default gen_random_uuid(),
  saved_topic_id uuid references public.saved_topics(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_text text not null,
  script_type text not null,
  draft_text text not null,
  ai_result jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  status text not null default 'pending',
  download_unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint topic_writing_practices_script_type_check
    check (script_type in ('knowledge', 'opinion', 'story', 'process')),
  constraint topic_writing_practices_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint topic_writing_practices_score_check
    check (score is null or (score >= 0 and score <= 100))
);

create index if not exists topic_writing_practices_user_created_idx
  on public.topic_writing_practices (user_id, created_at desc);

create index if not exists topic_writing_practices_saved_topic_idx
  on public.topic_writing_practices (saved_topic_id);

drop trigger if exists set_saved_topics_updated_at
  on public.saved_topics;

create trigger set_saved_topics_updated_at
before update on public.saved_topics
for each row
execute function public.set_updated_at();

drop trigger if exists set_topic_writing_practices_updated_at
  on public.topic_writing_practices;

create trigger set_topic_writing_practices_updated_at
before update on public.topic_writing_practices
for each row
execute function public.set_updated_at();

alter table public.saved_topics enable row level security;
alter table public.topic_writing_practices enable row level security;

drop policy if exists "Users can read own saved topics"
  on public.saved_topics;
drop policy if exists "Users can create own saved topics"
  on public.saved_topics;
drop policy if exists "Users can update own saved topics"
  on public.saved_topics;
drop policy if exists "Users can delete own saved topics"
  on public.saved_topics;
drop policy if exists "Admins can manage saved topics"
  on public.saved_topics;

create policy "Users can read own saved topics"
on public.saved_topics
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own saved topics"
on public.saved_topics
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own saved topics"
on public.saved_topics
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own saved topics"
on public.saved_topics
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage saved topics"
on public.saved_topics
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own topic practices"
  on public.topic_writing_practices;
drop policy if exists "Users can create own topic practices"
  on public.topic_writing_practices;
drop policy if exists "Admins can manage topic practices"
  on public.topic_writing_practices;

create policy "Users can read own topic practices"
on public.topic_writing_practices
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own topic practices"
on public.topic_writing_practices
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can manage topic practices"
on public.topic_writing_practices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.saved_topics to authenticated;
grant select, insert on public.topic_writing_practices to authenticated;

commit;
