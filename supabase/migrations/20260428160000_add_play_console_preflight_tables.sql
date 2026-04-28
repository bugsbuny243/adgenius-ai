-- Koschei Play Console readiness + release preflight (additive only)

create table if not exists public.play_console_readiness (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  package_name text,
  google_play_integration_id uuid references public.user_integrations(id) on delete set null,
  release_track text,
  aab_artifact_status text not null default 'pending',
  store_listing_status text not null default 'pending',
  app_content_status text not null default 'pending',
  data_safety_status text not null default 'pending',
  target_audience_status text not null default 'pending',
  ads_declaration_status text not null default 'pending',
  monetization_status text not null default 'pending',
  privacy_policy_status text not null default 'pending',
  blocker_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  manual_data_safety_confirmed boolean not null default false,
  manual_target_audience_confirmed boolean not null default false,
  manual_app_content_confirmed boolean not null default false,
  internal_testing_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

alter table if exists public.play_console_readiness add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.play_console_readiness add column if not exists package_name text;
alter table if exists public.play_console_readiness add column if not exists google_play_integration_id uuid references public.user_integrations(id) on delete set null;
alter table if exists public.play_console_readiness add column if not exists release_track text;
alter table if exists public.play_console_readiness add column if not exists aab_artifact_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists store_listing_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists app_content_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists data_safety_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists target_audience_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists ads_declaration_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists monetization_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists privacy_policy_status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists blocker_reasons jsonb not null default '[]'::jsonb;
alter table if exists public.play_console_readiness add column if not exists status text not null default 'pending';
alter table if exists public.play_console_readiness add column if not exists manual_data_safety_confirmed boolean not null default false;
alter table if exists public.play_console_readiness add column if not exists manual_target_audience_confirmed boolean not null default false;
alter table if exists public.play_console_readiness add column if not exists manual_app_content_confirmed boolean not null default false;
alter table if exists public.play_console_readiness add column if not exists internal_testing_confirmed boolean not null default false;
alter table if exists public.play_console_readiness add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_play_console_readiness_project_id on public.play_console_readiness(project_id);
create index if not exists idx_play_console_readiness_user_id on public.play_console_readiness(user_id);

create table if not exists public.play_store_listing_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_title text,
  short_description text,
  full_description text,
  privacy_policy_url text,
  language_code text not null default 'tr-TR',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.play_store_listing_assets add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.play_store_listing_assets add column if not exists store_title text;
alter table if exists public.play_store_listing_assets add column if not exists short_description text;
alter table if exists public.play_store_listing_assets add column if not exists full_description text;
alter table if exists public.play_store_listing_assets add column if not exists privacy_policy_url text;
alter table if exists public.play_store_listing_assets add column if not exists language_code text not null default 'tr-TR';
alter table if exists public.play_store_listing_assets add column if not exists status text not null default 'draft';
alter table if exists public.play_store_listing_assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.play_store_listing_assets add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_play_store_listing_assets_project_id on public.play_store_listing_assets(project_id);

create table if not exists public.play_release_preflight_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  release_track text,
  ok boolean not null,
  status text not null,
  blockers jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.play_release_preflight_checks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table if exists public.play_release_preflight_checks add column if not exists release_track text;
alter table if exists public.play_release_preflight_checks add column if not exists blockers jsonb not null default '[]'::jsonb;
alter table if exists public.play_release_preflight_checks add column if not exists warnings jsonb not null default '[]'::jsonb;
alter table if exists public.play_release_preflight_checks add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists idx_play_release_preflight_checks_project_id on public.play_release_preflight_checks(project_id);
create index if not exists idx_play_release_preflight_checks_created_at on public.play_release_preflight_checks(created_at desc);

alter table if exists public.play_console_readiness enable row level security;
alter table if exists public.play_store_listing_assets enable row level security;
alter table if exists public.play_release_preflight_checks enable row level security;

create policy if not exists "users own play console readiness rows"
on public.play_console_readiness for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "users own play listing rows"
on public.play_store_listing_assets for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "users own play preflight rows"
on public.play_release_preflight_checks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
