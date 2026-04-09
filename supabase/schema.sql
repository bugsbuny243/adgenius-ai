create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  slug varchar not null unique,
  owner_id uuid not null references public.workspace_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.workspace_users(id) on delete cascade,
  role varchar not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  placeholder text,
  system_prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.workspace_users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.workspace_users(id) on delete cascade,
  agent_type_id uuid not null references public.agent_types(id),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  model_name text not null,
  user_input text not null,
  result_text text,
  error_message text,
  metadata jsonb,
  tokens_input integer check (tokens_input is null or tokens_input >= 0),
  tokens_output integer check (tokens_output is null or tokens_output >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.workspace_users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_run_id, user_id)
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.workspace_users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  item_type text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null check (plan_name in ('free', 'pro', 'scale', 'enterprise')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  run_limit integer not null check (run_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null check (month_key ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
  runs_count integer not null default 0 check (runs_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key)
);

create table if not exists public.usage_metering (
  day date not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  request_count bigint not null default 0,
  active_users bigint not null default 0,
  primary key (day, project_id)
);

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists ix_workspaces_slug on public.workspaces(slug);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_projects_workspace_created on public.projects(workspace_id, created_at desc);
create index if not exists idx_agent_runs_workspace_created on public.agent_runs(workspace_id, created_at desc);
create index if not exists idx_agent_runs_user_created on public.agent_runs(user_id, created_at desc);
create index if not exists ix_agent_runs_agent_type_id on public.agent_runs(agent_type_id);
create index if not exists ix_agent_runs_created_at on public.agent_runs(created_at desc);
create index if not exists idx_project_items_project_created on public.project_items(project_id, created_at desc);
create index if not exists idx_project_items_workspace_created on public.project_items(workspace_id, created_at desc);
create index if not exists ix_saved_outputs_agent_run_id on public.saved_outputs(agent_run_id);
create index if not exists idx_saved_outputs_workspace_created on public.saved_outputs(workspace_id, created_at desc);
create index if not exists ix_usage_counters_workspace_id on public.usage_counters(workspace_id);
create index if not exists ix_usage_counters_month_key on public.usage_counters(month_key);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger trg_workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

create trigger trg_agent_types_updated_at
before update on public.agent_types
for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger trg_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

create trigger trg_saved_outputs_updated_at
before update on public.saved_outputs
for each row execute function public.set_updated_at();

create trigger trg_project_items_updated_at
before update on public.project_items
for each row execute function public.set_updated_at();

create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger trg_usage_counters_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.profiles enable row level security;
alter table public.agent_types enable row level security;

create policy workspaces_select_member on public.workspaces
for select using (public.is_workspace_member(id));

create policy projects_read_member on public.projects
for select using (public.is_workspace_member(workspace_id));

create policy project_items_read_member on public.project_items
for select using (public.is_workspace_member(workspace_id));

create policy agent_runs_select_member on public.agent_runs
for select using (public.is_workspace_member(workspace_id));

create policy saved_outputs_select_member on public.saved_outputs
for select using (public.is_workspace_member(workspace_id));

create policy subscriptions_select_member on public.subscriptions
for select using (public.is_workspace_member(workspace_id));

create policy usage_counters_select_member on public.usage_counters
for select using (public.is_workspace_member(workspace_id));

create policy workspace_members_select_member on public.workspace_members
for select using (public.is_workspace_member(workspace_id));

create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy agent_types_read_active on public.agent_types
for select using (is_active = true);
