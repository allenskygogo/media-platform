begin;

alter table public.bookings
  drop constraint if exists bookings_time_slot_check;

update public.bookings
set time_slot = case time_slot
  when 'morning' then '12:00'
  when 'afternoon' then '14:00'
  when 'evening' then '18:00'
  else time_slot
end
where time_slot in ('morning', 'afternoon', 'evening');

alter table public.bookings
  add constraint bookings_time_slot_check
  check (time_slot in ('12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'));

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
