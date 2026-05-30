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
    check (time_slot in ('12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00')),
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

create or replace function public.get_unavailable_booking_slots(
  p_type text,
  p_date date
)
returns table(time_slot text)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_slots as (
    select unnest(array['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']) as time_slot
  ),
  active_bookings as (
    select b.time_slot
    from public.bookings b
    where b.type = p_type
      and b.date = p_date
      and b.status <> 'cancelled'
  )
  select distinct candidate_slots.time_slot
  from candidate_slots
  join active_bookings booked
    on (p_date::timestamp + candidate_slots.time_slot::time) < (p_date::timestamp + booked.time_slot::time + interval '3 hours')
   and (p_date::timestamp + candidate_slots.time_slot::time + interval '3 hours') > (p_date::timestamp + booked.time_slot::time);
$$;

revoke all on function public.get_unavailable_booking_slots(text, date) from public;
grant execute on function public.get_unavailable_booking_slots(text, date) to authenticated;

commit;
