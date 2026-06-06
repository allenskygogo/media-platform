begin;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  industry text,
  plan text not null default 'free',
  provider text not null default 'openai',
  input_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint ai_usage_logs_feature_check
    check (feature in ('topics', 'script', 'shooting', 'planning', 'marketing', 'livestream', 'analysis', 'social', 'material', 'trending', 'chat', 'benchmark')),
  constraint ai_usage_logs_plan_check
    check (plan in ('free', 'trial', 'basic', 'standard', 'advanced', 'premium', 'managed')),
  constraint ai_usage_logs_provider_check
    check (provider in ('openai', 'mock', 'worker'))
);

create index if not exists ai_usage_logs_created_idx
  on public.ai_usage_logs (created_at desc);

create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_feature_created_idx
  on public.ai_usage_logs (feature, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "Anyone can create AI usage logs"
  on public.ai_usage_logs;
drop policy if exists "Users can read own AI usage logs"
  on public.ai_usage_logs;
drop policy if exists "Admins can read AI usage logs"
  on public.ai_usage_logs;

create policy "Anyone can create AI usage logs"
on public.ai_usage_logs
for insert
to anon, authenticated
with check (user_id is null or auth.uid() = user_id or public.is_admin());

create policy "Users can read own AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (public.is_admin());

grant insert on public.ai_usage_logs to anon, authenticated;
grant select on public.ai_usage_logs to authenticated;

commit;
