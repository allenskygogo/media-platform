begin;

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  plan_id text not null,
  legacy_tier text,
  amount integer not null,
  currency text not null default 'TWD',
  status text not null default 'pending',
  provider text not null default 'manual',
  provider_trade_no text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_number text,
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists plan_id text,
  add column if not exists legacy_tier text,
  add column if not exists amount integer not null default 0,
  add column if not exists currency text not null default 'TWD',
  add column if not exists status text not null default 'pending',
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_trade_no text,
  add column if not exists paid_at timestamptz,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists orders_order_number_idx on public.orders(order_number);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists orders_user_id_idx on public.orders(user_id);

alter table public.orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'orders_select_own'
  ) then
    create policy orders_select_own on public.orders
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
