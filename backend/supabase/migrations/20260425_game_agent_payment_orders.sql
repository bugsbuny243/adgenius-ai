-- Game Agent checkout payment orders

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null,
  provider text not null,
  currency text not null,
  amount numeric(10,2) not null,
  status text not null default 'pending',
  checkout_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_orders_plan_key_check check (plan_key in ('game_agent_starter', 'game_agent_creator', 'game_agent_studio')),
  constraint payment_orders_provider_check check (provider in ('shopier')),
  constraint payment_orders_currency_check check (currency = 'TRY'),
  constraint payment_orders_status_check check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'approved'))
);

create index if not exists idx_payment_orders_user_id on public.payment_orders(user_id);
create index if not exists idx_payment_orders_plan_key on public.payment_orders(plan_key);
create index if not exists idx_payment_orders_status on public.payment_orders(status);

alter table if exists public.payment_orders enable row level security;

drop policy if exists "users can read own payment orders" on public.payment_orders;
create policy "users can read own payment orders" on public.payment_orders
for select
using (user_id = auth.uid());

drop policy if exists "users can create own payment orders" on public.payment_orders;
create policy "users can create own payment orders" on public.payment_orders
for insert
with check (user_id = auth.uid());

drop trigger if exists trg_payment_orders_touch_updated_at on public.payment_orders;
create trigger trg_payment_orders_touch_updated_at
before update on public.payment_orders
for each row execute function public.touch_updated_at();
