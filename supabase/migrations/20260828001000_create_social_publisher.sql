begin;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'facebook', 'instagram', 'tiktok')),
  status text not null default 'pending_oauth' check (status in ('pending_oauth', 'connected', 'expired', 'revoked')),
  external_account_id text,
  external_account_name text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table if not exists public.social_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  public_url text,
  storage_path text,
  title text,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid references public.social_videos(id) on delete set null,
  title text not null,
  caption text not null,
  status text not null default 'pending' check (status in ('draft', 'pending', 'processing', 'success', 'partial_failed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_publish_targets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.social_publish_jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'facebook', 'instagram', 'tiktok')),
  social_account_id uuid references public.social_accounts(id) on delete set null,
  status text not null default 'waiting_connection' check (status in ('waiting_connection', 'pending', 'ready', 'uploading', 'processing', 'success', 'failed')),
  external_post_id text,
  external_post_url text,
  error_message text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_accounts_user_idx on public.social_accounts(user_id);
create index if not exists social_publish_jobs_user_created_idx on public.social_publish_jobs(user_id, created_at desc);
create index if not exists social_publish_targets_job_idx on public.social_publish_targets(job_id);
create index if not exists social_publish_targets_user_idx on public.social_publish_targets(user_id);
create index if not exists social_videos_user_created_idx on public.social_videos(user_id, created_at desc);

alter table public.social_accounts enable row level security;
alter table public.social_videos enable row level security;
alter table public.social_publish_jobs enable row level security;
alter table public.social_publish_targets enable row level security;

drop policy if exists social_accounts_select_own on public.social_accounts;
drop policy if exists social_accounts_insert_own on public.social_accounts;
drop policy if exists social_accounts_update_own on public.social_accounts;
drop policy if exists social_videos_select_own on public.social_videos;
drop policy if exists social_videos_insert_own on public.social_videos;
drop policy if exists social_publish_jobs_select_own on public.social_publish_jobs;
drop policy if exists social_publish_jobs_insert_own on public.social_publish_jobs;
drop policy if exists social_publish_targets_select_own on public.social_publish_targets;
drop policy if exists social_publish_targets_insert_own on public.social_publish_targets;

create policy social_accounts_select_own on public.social_accounts
  for select to authenticated
  using (auth.uid() = user_id);

create policy social_accounts_insert_own on public.social_accounts
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy social_accounts_update_own on public.social_accounts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy social_videos_select_own on public.social_videos
  for select to authenticated
  using (auth.uid() = user_id);

create policy social_videos_insert_own on public.social_videos
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy social_publish_jobs_select_own on public.social_publish_jobs
  for select to authenticated
  using (auth.uid() = user_id);

create policy social_publish_jobs_insert_own on public.social_publish_jobs
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy social_publish_targets_select_own on public.social_publish_targets
  for select to authenticated
  using (auth.uid() = user_id);

create policy social_publish_targets_insert_own on public.social_publish_targets
  for insert to authenticated
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
