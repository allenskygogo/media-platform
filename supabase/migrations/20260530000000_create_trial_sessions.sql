begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'staff')
      and status = 'active'
  );
$$;

create table if not exists public.trial_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'booked',
  current_second integer not null default 0,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trial_sessions_status_check
    check (status in ('booked', 'watching', 'completed', 'cancelled', 'no_show')),
  constraint trial_sessions_current_second_check
    check (current_second >= 0)
);

create index if not exists trial_sessions_scheduled_at_idx
  on public.trial_sessions (scheduled_at);

create index if not exists trial_sessions_status_idx
  on public.trial_sessions (status);

drop trigger if exists set_trial_sessions_updated_at
  on public.trial_sessions;

create trigger set_trial_sessions_updated_at
before update on public.trial_sessions
for each row
execute function public.set_updated_at();

alter table public.trial_sessions enable row level security;

drop policy if exists "Users can read own trial session"
  on public.trial_sessions;

drop policy if exists "Users can create own trial session"
  on public.trial_sessions;

drop policy if exists "Users can update own trial session"
  on public.trial_sessions;

drop policy if exists "Admins can manage trial sessions"
  on public.trial_sessions;

create policy "Users can read own trial session"
on public.trial_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own trial session"
on public.trial_sessions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'booked'
);

create policy "Users can update own trial session"
on public.trial_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can manage trial sessions"
on public.trial_sessions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.trial_sessions to authenticated;

commit;
