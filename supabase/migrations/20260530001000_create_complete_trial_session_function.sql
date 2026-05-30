begin;

create or replace function public.complete_trial_session()
returns table (
  expires_at timestamptz,
  trial_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.trial_sessions
  set
    status = 'completed',
    current_second = greatest(current_second, 10800),
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  where user_id = v_user_id;

  if not found then
    raise exception 'Trial session not found';
  end if;

  update public.memberships
  set
    expires_at = coalesce(expires_at, now() + interval '90 days'),
    trial_completed_at = coalesce(trial_completed_at, now()),
    updated_at = now()
  where user_id = v_user_id
    and plan_id = 'trial'
    and status = 'active';

  if not found then
    raise exception 'Active trial membership not found';
  end if;

  return query
  select m.expires_at, m.trial_completed_at
  from public.memberships m
  where m.user_id = v_user_id
    and m.plan_id = 'trial'
    and m.status = 'active'
  order by m.starts_at desc
  limit 1;
end;
$$;

revoke all on function public.complete_trial_session() from public;
grant execute on function public.complete_trial_session() to authenticated;

commit;
