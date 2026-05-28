begin;

create table if not exists public.beta_applications (
  id bigint primary key default ((extract(epoch from now()) * 1000)::bigint),

  name text not null,
  email text not null,
  phone text not null,
  line_id text,

  referral_source text not null,
  knows_about_us text not null,
  industry text not null,
  has_social_media text not null,
  weekly_hours text not null,

  motivation text not null,
  pain_points text,

  committed boolean not null default false,
  status text not null default 'pending',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beta_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint beta_applications_motivation_min_length_check
    check (char_length(trim(motivation)) >= 50)
);

create index if not exists beta_applications_status_idx
  on public.beta_applications (status);

create index if not exists beta_applications_created_at_idx
  on public.beta_applications (created_at desc);

create index if not exists beta_applications_email_idx
  on public.beta_applications (email);

create or replace function public.set_beta_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beta_applications_updated_at
  on public.beta_applications;

create trigger set_beta_applications_updated_at
before update on public.beta_applications
for each row
execute function public.set_beta_applications_updated_at();

alter table public.beta_applications enable row level security;

drop policy if exists "Public can insert beta applications"
  on public.beta_applications;

drop policy if exists "Admins can read beta applications"
  on public.beta_applications;

drop policy if exists "Admins can update beta applications"
  on public.beta_applications;

create policy "Public can insert beta applications"
on public.beta_applications
for insert
to anon, authenticated
with check (
  status = 'pending'
  and committed = true
);

-- These admin policies require Supabase Auth with role=admin in app_metadata.
-- The current app still uses localStorage auth, so production admin access should
-- go through a server API / Edge Function with service role until Auth is migrated.
create policy "Admins can read beta applications"
on public.beta_applications
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

create policy "Admins can update beta applications"
on public.beta_applications
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

grant insert on public.beta_applications to anon;
grant insert, select, update on public.beta_applications to authenticated;

commit;
