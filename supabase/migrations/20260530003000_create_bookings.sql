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

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  date date not null,
  time_slot text not null,
  topic text not null,
  notes text,
  status text not null default 'pending',
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_type_check
    check (type in ('oneonone', 'shooting')),
  constraint bookings_time_slot_check
    check (time_slot in ('morning', 'afternoon', 'evening')),
  constraint bookings_status_check
    check (status in ('pending', 'confirmed', 'cancelled')),
  constraint bookings_topic_min_length_check
    check (char_length(trim(topic)) > 0)
);

create index if not exists bookings_user_id_idx
  on public.bookings (user_id);

create index if not exists bookings_type_status_date_idx
  on public.bookings (type, status, date);

create unique index if not exists bookings_active_slot_unique_idx
  on public.bookings (type, date, time_slot)
  where status <> 'cancelled';

drop trigger if exists set_bookings_updated_at
  on public.bookings;

create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "Users can read own bookings"
  on public.bookings;

drop policy if exists "Users can create own pending bookings"
  on public.bookings;

drop policy if exists "Users can cancel own pending bookings"
  on public.bookings;

drop policy if exists "Admins can manage bookings"
  on public.bookings;

create policy "Users can read own bookings"
on public.bookings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own pending bookings"
on public.bookings
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

create policy "Users can cancel own pending bookings"
on public.bookings
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'pending'
)
with check (
  auth.uid() = user_id
  and status = 'cancelled'
);

create policy "Admins can manage bookings"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.bookings to authenticated;

commit;
