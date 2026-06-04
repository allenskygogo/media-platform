begin;

create table if not exists public.course_catalog (
  id text primary key,
  courses jsonb not null default '[]'::jsonb,
  cf_videos jsonb not null default '[]'::jsonb,
  video_assignments jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.course_catalog
  add column if not exists courses jsonb not null default '[]'::jsonb,
  add column if not exists cf_videos jsonb not null default '[]'::jsonb,
  add column if not exists video_assignments jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

insert into public.course_catalog (id, courses, cf_videos, video_assignments)
values ('main', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.course_catalog enable row level security;

drop policy if exists "Anyone can read course catalog" on public.course_catalog;
create policy "Anyone can read course catalog"
on public.course_catalog
for select
to anon, authenticated
using (id = 'main');

commit;

notify pgrst, 'reload schema';
