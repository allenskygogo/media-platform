begin;

create table if not exists public.resource_pack_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'direct',
  path text not null default '/beta',
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint resource_pack_events_event_type_check
    check (event_type in ('page_view', 'view_content', 'line_click', 'line_copy', 'line_open'))
);

create index if not exists resource_pack_events_created_idx
  on public.resource_pack_events (created_at desc);

create index if not exists resource_pack_events_source_created_idx
  on public.resource_pack_events (source, created_at desc);

create index if not exists resource_pack_events_type_created_idx
  on public.resource_pack_events (event_type, created_at desc);

alter table public.resource_pack_events enable row level security;

drop policy if exists "Anyone can create resource pack events"
  on public.resource_pack_events;

drop policy if exists "Anyone can read resource pack events"
  on public.resource_pack_events;

create policy "Anyone can create resource pack events"
on public.resource_pack_events
for insert
to anon, authenticated
with check (true);

create policy "Anyone can read resource pack events"
on public.resource_pack_events
for select
to anon, authenticated
using (true);

grant insert, select on public.resource_pack_events to anon, authenticated;

commit;
