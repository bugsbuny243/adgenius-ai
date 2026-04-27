-- Billing and usage schema

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  billing_interval text not null default 'month',
  quota_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  provider text,
  provider_subscription_id text,
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  metric text not null,
  period_start date not null,
  period_end date not null,
  used_quantity bigint not null default 0,
  quota_quantity bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, metric, period_start)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  quantity numeric(12,2) not null default 1,
  source text,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workspace_id, idempotency_key)
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text,
  provider_order_id text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  provider text,
  provider_payment_id text,
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  transaction_type text not null default 'charge',
  status text not null default 'pending',
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text,
  event_type text not null,
  event_id text,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- patch columns for compatibility
alter table public.subscriptions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.subscriptions add column if not exists status text not null default 'trialing';
alter table public.subscriptions add column if not exists amount numeric(12,2) not null default 0;
alter table public.subscriptions add column if not exists currency text not null default 'USD';
alter table public.usage_events add column if not exists idempotency_key text;
alter table public.usage_events add column if not exists source text;

-- constraints added safely
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check check (status in ('trialing','active','past_due','canceled','incomplete','paused'));
alter table public.payment_orders drop constraint if exists payment_orders_status_check;
alter table public.payment_orders add constraint payment_orders_status_check check (status in ('pending','processing','paid','failed','canceled'));
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending','succeeded','failed','refunded','canceled'));
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check check (status in ('pending','succeeded','failed','reversed'));

create index if not exists idx_subscriptions_workspace_id on public.subscriptions (workspace_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_usage_counters_workspace_metric_period on public.usage_counters (workspace_id, metric, period_start desc);
create index if not exists idx_usage_events_workspace_created_at on public.usage_events (workspace_id, created_at desc);
create index if not exists idx_usage_events_type on public.usage_events (event_type);
create index if not exists idx_payment_orders_workspace_id on public.payment_orders (workspace_id);
create index if not exists idx_payments_workspace_id on public.payments (workspace_id);
create index if not exists idx_transactions_workspace_id on public.transactions (workspace_id);
create index if not exists idx_billing_events_workspace_id on public.billing_events (workspace_id);
create index if not exists idx_billing_events_created_at_desc on public.billing_events (created_at desc);

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at before update on public.plans for each row execute function public.touch_updated_at();
drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions for each row execute function public.touch_updated_at();
drop trigger if exists trg_usage_counters_updated_at on public.usage_counters;
create trigger trg_usage_counters_updated_at before update on public.usage_counters for each row execute function public.touch_updated_at();
drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at before update on public.payment_orders for each row execute function public.touch_updated_at();
drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments for each row execute function public.touch_updated_at();
drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions for each row execute function public.touch_updated_at();

select pg_notify('pgrst', 'reload schema');
