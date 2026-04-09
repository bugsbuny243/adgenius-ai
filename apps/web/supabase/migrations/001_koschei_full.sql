create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  )
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspaces
    where id = p_workspace_id and owner_id = auth.uid()
  )
$$;

create or replace function public.increment_usage_counter(p_workspace_id uuid, p_month_key text)
returns integer language plpgsql security definer as $$
declare v_count integer;
begin
  insert into public.usage_counters (workspace_id, month_key, runs_count)
  values (p_workspace_id, p_month_key, 1)
  on conflict (workspace_id, month_key)
  do update set runs_count = usage_counters.runs_count + 1, updated_at = now()
  returning runs_count into v_count;
  return v_count;
end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar not null,
  slug varchar not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role varchar not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('owner','admin','member'))
);

create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default '🤖',
  description text,
  system_prompt text not null,
  placeholder text,
  capabilities text[] not null default '{}',
  model_alias text not null default 'koschei-text-v1',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid references public.agent_types(id) on delete set null,
  agent_slug text not null,
  user_input text not null,
  result_text text,
  model_name text not null default 'koschei-text-v1',
  status text not null default 'pending',
  error_message text,
  tokens_input integer,
  tokens_output integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runs_status_check check (status in ('pending','running','completed','failed')),
  constraint agent_runs_tokens_input_check check (tokens_input is null or tokens_input >= 0),
  constraint agent_runs_tokens_output_check check (tokens_output is null or tokens_output >= 0)
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  title text not null,
  content text not null,
  editor_content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_run_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  title text not null,
  content text not null,
  editor_content jsonb,
  item_type text not null default 'output',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_items_type_check check (item_type in ('output','note','draft'))
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null default 'free',
  run_limit integer not null default 30,
  status text not null default 'active',
  expires_at timestamptz,
  shopier_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan_name in ('free','starter','pro')),
  constraint subscriptions_status_check check (status in ('active','cancelled','past_due')),
  constraint subscriptions_limit_check check (run_limit > 0)
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key),
  constraint usage_counters_runs_check check (runs_count >= 0),
  constraint usage_counters_month_check check (month_key ~ '^\\d{4}-\\d{2}$')
);

create table if not exists public.usage_metering (
  day date not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  request_count bigint not null default 0,
  active_users bigint not null default 0,
  primary key (day, project_id)
);
