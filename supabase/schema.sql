-- Koschei AI Command Center schema (workspace-first)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------
-- Utility functions
-- -------------------------------------------------------------------
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------------
-- Core identity + tenancy
-- -------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- Agent catalog
-- -------------------------------------------------------------------
create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

-- -------------------------------------------------------------------
-- Product entities
-- -------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  title text,
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid references public.agent_types(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  project_item_id uuid references public.project_items(id) on delete set null,
  status text not null,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  project_item_id uuid references public.project_items(id) on delete set null,
  title text,
  output_type text not null default 'generic',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- Billing / usage
-- -------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_code text not null default 'free',
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  quota bigint not null default 0,
  used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, metric, period_start)
);

create table if not exists public.usage_metering (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  usage_counter_id uuid references public.usage_counters(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  quantity bigint not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- Backfill columns for existing installs (safe no-op if already exists)
-- -------------------------------------------------------------------
alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.agent_runs add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.agent_runs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.agent_runs add column if not exists agent_type_id uuid references public.agent_types(id) on delete set null;
alter table public.agent_runs add column if not exists project_item_id uuid references public.project_items(id) on delete set null;
alter table public.agent_runs add column if not exists input_payload jsonb not null default '{}'::jsonb;
alter table public.agent_runs add column if not exists output_payload jsonb not null default '{}'::jsonb;
alter table public.agent_runs add column if not exists error_message text;
alter table public.agent_runs add column if not exists tokens_in integer not null default 0;
alter table public.agent_runs add column if not exists tokens_out integer not null default 0;
alter table public.agent_runs add column if not exists total_tokens integer not null default 0;
alter table public.agent_runs add column if not exists completed_at timestamptz;

-- -------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------
create index if not exists idx_workspaces_owner on public.workspaces(owner_user_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_users_user on public.workspace_users(user_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id, created_at desc);
create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_project_items_workspace on public.project_items(workspace_id, created_at desc);
create index if not exists idx_project_items_project on public.project_items(project_id, created_at desc);
create index if not exists idx_agent_runs_workspace on public.agent_runs(workspace_id, created_at desc);
create index if not exists idx_agent_runs_agent_type on public.agent_runs(agent_type_id, created_at desc);
create index if not exists idx_saved_outputs_workspace on public.saved_outputs(workspace_id, created_at desc);
create index if not exists idx_usage_counters_workspace on public.usage_counters(workspace_id, metric, period_start desc);
create index if not exists idx_usage_metering_workspace on public.usage_metering(workspace_id, created_at desc);

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_users enable row level security;
alter table public.profiles enable row level security;
alter table public.agent_types enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.usage_metering enable row level security;

-- Drop old policies if rerun
Drop policy if exists "profiles_select_own" on public.profiles;
Drop policy if exists "profiles_update_own" on public.profiles;
Drop policy if exists "projects_owner_all" on public.projects;
Drop policy if exists "ad_events_owner_read" on public.ad_events;

-- Workspaces
create policy "workspaces_member_select"
on public.workspaces
for select
using (public.is_workspace_member(id));

create policy "workspaces_owner_insert"
on public.workspaces
for insert
with check (auth.uid() = owner_user_id);

create policy "workspaces_owner_update"
on public.workspaces
for update
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

-- Workspace members
create policy "workspace_members_member_select"
on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_owner_manage"
on public.workspace_members
for all
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

-- Workspace users
create policy "workspace_users_member_read"
on public.workspace_users
for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_users_self_upsert"
on public.workspace_users
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id and public.is_workspace_member(workspace_id));

-- Profiles
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_upsert_own"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Workspace-scoped entities
create policy "agent_types_workspace_access"
on public.agent_types
for all
using (workspace_id is null or public.is_workspace_member(workspace_id))
with check (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "projects_workspace_access"
on public.projects
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and auth.uid() = owner_id);

create policy "project_items_workspace_access"
on public.project_items
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and auth.uid() = user_id);

create policy "agent_runs_workspace_access"
on public.agent_runs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and auth.uid() = user_id);

create policy "saved_outputs_workspace_access"
on public.saved_outputs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id) and auth.uid() = user_id);

create policy "subscriptions_workspace_access"
on public.subscriptions
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy "usage_counters_workspace_access"
on public.usage_counters
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "usage_metering_workspace_access"
on public.usage_metering
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

-- -------------------------------------------------------------------
-- Trigger: auto-bootstrap profile + personal workspace on signup
-- -------------------------------------------------------------------
create or replace function public.handle_new_user_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  generated_name text;
begin
  generated_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Workspace') || ' Workspace';

  insert into public.workspaces (name, owner_user_id)
  values (generated_name, new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (ws_id, new.id, 'owner', new.id);

  insert into public.workspace_users (workspace_id, user_id, display_name)
  values (ws_id, new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  insert into public.profiles (id, full_name, default_workspace_id, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), ws_id, 'member')
  on conflict (id) do update
    set default_workspace_id = excluded.default_workspace_id,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_bootstrap();
