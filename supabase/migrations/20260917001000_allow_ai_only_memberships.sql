-- Production retains legacy CHECK constraints even though the baseline migration
-- uses text columns. Extend both allowlists together without changing any rows.
begin;

alter table public.memberships
  drop constraint if exists memberships_plan_id_check,
  drop constraint if exists memberships_legacy_tier_check;

alter table public.memberships
  add constraint memberships_plan_id_check check (
    plan_id in ('trial', 'creator', 'master', 'managed', 'ai_trial', 'ai_subscription')
  ),
  add constraint memberships_legacy_tier_check check (
    legacy_tier is null or legacy_tier in (
      'basic', 'standard', 'advanced', 'managed', 'ai_trial', 'ai_subscription'
    )
  );

commit;
