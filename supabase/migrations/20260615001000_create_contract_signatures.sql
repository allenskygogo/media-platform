begin;

create extension if not exists pgcrypto;

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  contract_version text not null default 'creator-online-v1',
  plan_id text not null,
  legacy_tier text,
  billing_cycle text not null default 'annual',
  amount integer not null default 0,
  amount_label text,
  currency text not null default 'TWD',
  signer_name text not null,
  signer_email text not null,
  signer_phone text,
  signer_identity text,
  signer_address text,
  line_id text,
  consent_text text not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  status text not null default 'signed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_signatures_user_signed_idx
  on public.contract_signatures(user_id, signed_at desc);
create index if not exists contract_signatures_order_idx
  on public.contract_signatures(order_id);
create index if not exists contract_signatures_status_idx
  on public.contract_signatures(status, signed_at desc);

alter table public.contract_signatures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contract_signatures' and policyname = 'contract_signatures_select_own'
  ) then
    create policy contract_signatures_select_own on public.contract_signatures
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contract_signatures' and policyname = 'contract_signatures_insert_own'
  ) then
    create policy contract_signatures_insert_own on public.contract_signatures
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contract_signatures' and policyname = 'contract_signatures_admin_all'
  ) then
    create policy contract_signatures_admin_all on public.contract_signatures
      for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
