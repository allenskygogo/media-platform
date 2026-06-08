begin;

create table if not exists public.learning_reminders (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  course_id integer,
  channel text not null default 'internal',
  message text not null,
  created_at timestamptz not null default now(),

  constraint learning_reminders_channel_check
    check (channel in ('internal', 'line', 'email', 'sms'))
);

create index if not exists learning_reminders_user_created_idx
  on public.learning_reminders (user_id, created_at desc);

create index if not exists learning_reminders_created_idx
  on public.learning_reminders (created_at desc);

alter table public.learning_reminders enable row level security;

drop policy if exists "Admins can manage learning reminders"
  on public.learning_reminders;

create policy "Admins can manage learning reminders"
on public.learning_reminders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.learning_reminders to authenticated;

commit;
