begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text unique not null,
  role text not null default 'student',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists role text not null default 'student',
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  legacy_tier text,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  trial_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memberships
  add column if not exists user_id uuid,
  add column if not exists plan_id text,
  add column if not exists legacy_tier text,
  add column if not exists status text not null default 'active',
  add column if not exists starts_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists trial_completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_role_status_idx on public.profiles(role, status);
create index if not exists memberships_user_status_starts_idx on public.memberships(user_id, status, starts_at desc);

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

revoke update on public.profiles from authenticated;
grant update(display_name, updated_at) on public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own on public.profiles
      for select to authenticated
      using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own_name'
  ) then
    create policy profiles_update_own_name on public.profiles
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memberships' and policyname = 'memberships_select_own'
  ) then
    create policy memberships_select_own on public.memberships
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

commit;
