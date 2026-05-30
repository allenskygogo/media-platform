begin;

alter table public.bookings
  add column if not exists google_event_id text,
  add column if not exists google_event_link text,
  add column if not exists calendar_synced_at timestamptz;

create index if not exists bookings_google_event_id_idx
  on public.bookings (google_event_id)
  where google_event_id is not null;

commit;
