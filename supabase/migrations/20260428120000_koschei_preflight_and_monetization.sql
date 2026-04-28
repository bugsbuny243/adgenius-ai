-- Koschei technical preflight + monetization readiness

create table if not exists public.game_technical_checklists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.game_projects(id) on delete set null,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  checklist_type text not null,
  required_items jsonb not null default '[]'::jsonb,
  confirmed_items jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_technical_checklists_workspace_id on public.game_technical_checklists(workspace_id);
create index if not exists idx_game_technical_checklists_unity_game_project_id on public.game_technical_checklists(unity_game_project_id);

create table if not exists public.game_monetization_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.game_projects(id) on delete set null,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  monetization_required boolean not null default false,
  iap_required boolean not null default false,
  ads_required boolean not null default false,
  subscriptions_required boolean not null default false,
  backend_required boolean not null default false,
  multiplayer_required boolean not null default false,
  privacy_policy_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unity_game_project_id)
);

create table if not exists public.game_iap_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.game_projects(id) on delete set null,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  product_id text not null,
  product_type text not null default 'managed',
  title text,
  description text,
  price_micros bigint,
  currency_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_iap_products_unity_game_project_id on public.game_iap_products(unity_game_project_id);

create table if not exists public.game_ad_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.game_projects(id) on delete set null,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  ad_network text not null default 'admob',
  ad_format text not null,
  ad_unit_id text not null,
  placement_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_ad_units_unity_game_project_id on public.game_ad_units(unity_game_project_id);

alter table if exists public.game_release_jobs add column if not exists blocker_reasons jsonb not null default '[]'::jsonb;
