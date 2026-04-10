-- Koschei AI Command Center schema foundation
-- Workspace-centric model for projects, agent runs and saved outputs.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Core workspace + identity
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  model_name text not null default 'gemini-2.5-pro',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_types
  drop constraint if exists agent_types_workspace_id_key_key;

-- ---------------------------------------------------------
-- Product domain entities
-- ---------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_output_id uuid,
  item_type text not null default 'note',
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'done')),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  model_name text not null default 'gemini-2.5-pro',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  user_input text,
  result_text text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.context_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  assembled_context jsonb not null default '{}'::jsonb,
  system_instruction text,
  created_at timestamptz not null default now()
);

alter table public.agent_runs
  add column if not exists context_snapshot_id uuid references public.context_snapshots(id) on delete set null;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('file', 'text', 'url', 'brief')),
  title text not null,
  raw_text text,
  file_path text,
  source_url text,
  status text not null default 'ready' check (status in ('draft', 'ready', 'archived', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create table if not exists public.workspace_memory_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_type text not null default 'note',
  title text not null,
  content text not null,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  entry_type text not null default 'note',
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  project_item_id uuid references public.project_items(id) on delete set null,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.run_context_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  context_snapshot_id uuid not null references public.context_snapshots(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  chunk_id uuid references public.knowledge_chunks(id) on delete set null,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  project_item_id uuid references public.project_items(id) on delete set null,
  role text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_items_source_output_id_fkey'
      and conrelid = 'public.project_items'::regclass
  ) then
    alter table public.project_items
      add constraint project_items_source_output_id_fkey
      foreign key (source_output_id) references public.saved_outputs(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------
-- Usage + subscription awareness
-- ---------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null default 'free',
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  run_limit integer not null default 100,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  period_start date not null default current_date,
  period_end date,
  runs_count integer not null default 0,
  tokens_input_count bigint not null default 0,
  tokens_output_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_metering (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  metric text not null,
  quantity numeric(14, 4) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Legacy out-of-scope cleanup
-- ---------------------------------------------------------
drop table if exists public.ad_events;

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------
create index if not exists idx_workspaces_owner on public.workspaces(owner_user_id);
create index if not exists idx_workspace_members_workspace_user on public.workspace_members(workspace_id, user_id);
create index if not exists idx_workspace_members_user_workspace on public.workspace_members(user_id, workspace_id);
create index if not exists idx_workspace_users_workspace_user on public.workspace_users(workspace_id, user_id);
create index if not exists idx_agent_types_workspace_active on public.agent_types(workspace_id, is_active);
create unique index if not exists ux_agent_types_workspace_key
  on public.agent_types(workspace_id, key)
  where workspace_id is not null;
create unique index if not exists ux_agent_types_global_key
  on public.agent_types(key)
  where workspace_id is null;
create index if not exists idx_projects_workspace on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_workspace_project on public.project_items(workspace_id, project_id, created_at desc);
create index if not exists idx_project_items_source_output on public.project_items(source_output_id);
create index if not exists idx_agent_runs_workspace on public.agent_runs(workspace_id, created_at desc);
create index if not exists idx_agent_runs_agent_type on public.agent_runs(agent_type_id, created_at desc);
create index if not exists idx_saved_outputs_workspace on public.saved_outputs(workspace_id, created_at desc);
create index if not exists idx_saved_outputs_agent_run on public.saved_outputs(agent_run_id);
create index if not exists idx_saved_outputs_project on public.saved_outputs(project_id, created_at desc);

create index if not exists idx_context_snapshots_workspace on public.context_snapshots(workspace_id, created_at desc);
create index if not exists idx_agent_runs_context_snapshot on public.agent_runs(context_snapshot_id);
create index if not exists idx_knowledge_sources_workspace on public.knowledge_sources(workspace_id, created_at desc);
create index if not exists idx_knowledge_sources_project on public.knowledge_sources(project_id, created_at desc);
create index if not exists idx_knowledge_chunks_source on public.knowledge_chunks(source_id, chunk_index);
create index if not exists idx_workspace_memory_workspace on public.workspace_memory_entries(workspace_id, is_active, priority desc, created_at desc);
create index if not exists idx_project_knowledge_project on public.project_knowledge_entries(project_id, created_at desc);
create index if not exists idx_run_context_sources_run on public.run_context_sources(agent_run_id, created_at asc);
create index if not exists idx_usage_metering_workspace on public.usage_metering(workspace_id, created_at desc);

-- ---------------------------------------------------------
-- Helper functions for RLS
-- ---------------------------------------------------------
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;


create or replace function public.increment_usage_counters(
  target_workspace_id uuid,
  input_tokens integer,
  output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_counters (workspace_id, period_start, runs_count, tokens_input_count, tokens_output_count)
  values (target_workspace_id, current_date, 1, greatest(input_tokens, 0), greatest(output_tokens, 0))
  on conflict (workspace_id)
  do update set
    runs_count = public.usage_counters.runs_count + 1,
    tokens_input_count = public.usage_counters.tokens_input_count + greatest(input_tokens, 0),
    tokens_output_count = public.usage_counters.tokens_output_count + greatest(output_tokens, 0),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_users enable row level security;
alter table public.agent_types enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.context_snapshots enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.workspace_memory_entries enable row level security;
alter table public.project_knowledge_entries enable row level security;
alter table public.run_context_sources enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.usage_metering enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists projects_owner_all on public.projects;
drop policy if exists profiles_self_all on public.profiles;
drop policy if exists workspaces_member_read on public.workspaces;
drop policy if exists workspaces_self_insert on public.workspaces;
drop policy if exists workspaces_owner_update on public.workspaces;
drop policy if exists workspace_members_member_read on public.workspace_members;
drop policy if exists workspace_members_owner_manage on public.workspace_members;
drop policy if exists workspace_users_member_all on public.workspace_users;
drop policy if exists agent_types_member_read on public.agent_types;
drop policy if exists agent_types_owner_manage on public.agent_types;
drop policy if exists projects_member_all on public.projects;
drop policy if exists project_items_member_all on public.project_items;
drop policy if exists agent_runs_member_all on public.agent_runs;
drop policy if exists saved_outputs_member_all on public.saved_outputs;
drop policy if exists context_snapshots_member_all on public.context_snapshots;
drop policy if exists knowledge_sources_member_all on public.knowledge_sources;
drop policy if exists knowledge_chunks_member_all on public.knowledge_chunks;
drop policy if exists workspace_memory_member_all on public.workspace_memory_entries;
drop policy if exists project_knowledge_member_all on public.project_knowledge_entries;
drop policy if exists run_context_sources_member_all on public.run_context_sources;
drop policy if exists subscriptions_member_read on public.subscriptions;
drop policy if exists subscriptions_owner_manage on public.subscriptions;
drop policy if exists usage_counters_member_all on public.usage_counters;
drop policy if exists usage_metering_member_all on public.usage_metering;

create policy profiles_self_all on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy workspaces_member_read on public.workspaces
for select
using (public.is_workspace_member(id));


create policy workspaces_self_insert on public.workspaces
for insert
with check (auth.uid() = owner_user_id);

create policy workspaces_owner_update on public.workspaces
for update
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

create policy workspace_members_member_read on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));

create policy workspace_members_owner_manage on public.workspace_members
for all
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy workspace_users_member_all on public.workspace_users
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy agent_types_member_read on public.agent_types
for select
using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy agent_types_owner_manage on public.agent_types
for all
using (workspace_id is not null and public.is_workspace_owner(workspace_id))
with check (workspace_id is not null and public.is_workspace_owner(workspace_id));

create policy projects_member_all on public.projects
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy project_items_member_all on public.project_items
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy agent_runs_member_all on public.agent_runs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy saved_outputs_member_all on public.saved_outputs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));


create policy context_snapshots_member_all on public.context_snapshots
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy knowledge_sources_member_all on public.knowledge_sources
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy knowledge_chunks_member_all on public.knowledge_chunks
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy workspace_memory_member_all on public.workspace_memory_entries
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy project_knowledge_member_all on public.project_knowledge_entries
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy run_context_sources_member_all on public.run_context_sources
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy subscriptions_member_read on public.subscriptions
for select
using (public.is_workspace_member(workspace_id));

create policy subscriptions_owner_manage on public.subscriptions
for all
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy usage_counters_member_all on public.usage_counters
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy usage_metering_member_all on public.usage_metering
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- Seed global agent types
-- ---------------------------------------------------------
insert into public.agent_types (workspace_id, key, name, description, model_name)
values
  (null, 'creative-strategist', 'Creative Strategist', 'Plans messaging and campaign direction.', 'gemini-2.5-pro'),
  (null, 'copy-optimizer', 'Copy Optimizer', 'Refines drafts and improves clarity.', 'gemini-2.5-pro'),
  (null, 'ops-assistant', 'Ops Assistant', 'Summarizes tasks and execution plans.', 'gemini-2.5-pro')
on conflict do nothing;
