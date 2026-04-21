-- Owner-only admin module additions (ads + billing)

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slot_name text not null,
  page_path text not null,
  position text not null,
  internal_section text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_slot_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ad_placement_id uuid not null references public.ad_placements(id) on delete cascade,
  provider text not null default 'internal',
  config_metadata text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ad_placement_id uuid references public.ad_placements(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ads_revenue_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null default 'internal',
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  total_amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  reference text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  transaction_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.ad_placements enable row level security;
alter table public.ad_slot_configs enable row level security;
alter table public.ad_events enable row level security;
alter table public.ads_revenue_records enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.billing_events enable row level security;

create or replace function public.is_owner_admin(_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create policy "owner admin access ad placements"
on public.ad_placements
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access ad slot configs"
on public.ad_slot_configs
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access ad events"
on public.ad_events
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access ads revenue"
on public.ads_revenue_records
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access invoices"
on public.invoices
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access payments"
on public.payments
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access transactions"
on public.transactions
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));

create policy "owner admin access billing events"
on public.billing_events
for all
using (public.is_owner_admin(workspace_id))
with check (public.is_owner_admin(workspace_id));
