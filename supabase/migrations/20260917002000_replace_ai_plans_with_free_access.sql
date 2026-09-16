-- Retire AI trial/subscription identities. Preserve account status and expiry.
begin;

alter table public.memberships
  drop constraint if exists memberships_plan_id_check,
  drop constraint if exists memberships_legacy_tier_check;

update public.memberships
set plan_id = 'ai_free', legacy_tier = 'ai_free'
where plan_id in ('ai_trial', 'ai_subscription');

alter table public.memberships
  add constraint memberships_plan_id_check check (
    plan_id in ('trial', 'creator', 'master', 'managed', 'ai_free')
  ),
  add constraint memberships_legacy_tier_check check (
    legacy_tier is null or legacy_tier in (
      'basic', 'standard', 'advanced', 'managed', 'ai_free'
    )
  );

commit;
