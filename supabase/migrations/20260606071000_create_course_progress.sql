begin;

create table if not exists public.course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id integer not null,
  lesson_id integer not null,
  current_second integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  watch_count integer not null default 0,
  last_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, course_id, lesson_id),
  constraint course_progress_current_second_check check (current_second >= 0),
  constraint course_progress_watch_count_check check (watch_count >= 0)
);

create index if not exists course_progress_user_course_idx
  on public.course_progress (user_id, course_id, updated_at desc);

drop trigger if exists set_course_progress_updated_at
  on public.course_progress;

create trigger set_course_progress_updated_at
before update on public.course_progress
for each row
execute function public.set_updated_at();

alter table public.course_progress enable row level security;

drop policy if exists "Users can read own course progress"
  on public.course_progress;
drop policy if exists "Users can upsert own course progress"
  on public.course_progress;
drop policy if exists "Users can update own course progress"
  on public.course_progress;
drop policy if exists "Admins can manage course progress"
  on public.course_progress;

create policy "Users can read own course progress"
on public.course_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can upsert own course progress"
on public.course_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own course progress"
on public.course_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can manage course progress"
on public.course_progress
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.course_progress to authenticated;

commit;
