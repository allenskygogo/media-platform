begin;

alter table public.memberships
  drop constraint if exists memberships_plan_id_check,
  drop constraint if exists memberships_legacy_tier_check;

alter table public.memberships
  add constraint memberships_plan_id_check check (plan_id in ('trial','online','creator','master','managed','ai_free')),
  add constraint memberships_legacy_tier_check check (legacy_tier is null or legacy_tier in ('basic','online','standard','advanced','managed','ai_free'));

alter table public.orders
  drop constraint if exists orders_plan_id_check,
  drop constraint if exists orders_legacy_tier_check;

alter table public.orders
  add constraint orders_plan_id_check check (plan_id in ('trial','online','creator','master','managed')),
  add constraint orders_legacy_tier_check check (legacy_tier is null or legacy_tier in ('basic','online','standard','advanced','managed'));

-- Signatures are written through the authenticated Worker, which validates consent and price.
drop policy if exists contract_signatures_insert_own on public.contract_signatures;

alter table public.orders add column if not exists signed_contract_id uuid references public.contract_signatures(id) on delete set null;
create unique index if not exists orders_signed_contract_idx on public.orders(signed_contract_id) where signed_contract_id is not null;

notify pgrst, 'reload schema';
commit;
