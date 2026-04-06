create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug varchar not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text,
  description text,
  system_prompt text not null,
  placeholder text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  user_input text not null,
  model_name text not null default 'gemini-2.5-flash',
  result_text text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  tokens_input integer,
  tokens_output integer,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null default 'starter' check (plan_name in ('free', 'starter', 'pro')),
  run_limit integer not null default 100 check (run_limit > 0),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key)
);

create or replace function public.increment_usage_counter(p_workspace_id uuid, p_month_key text)
returns integer
language plpgsql
as $$
declare
  v_runs_count integer;
begin
  insert into public.usage_counters (workspace_id, month_key, runs_count)
  values (p_workspace_id, p_month_key, 1)
  on conflict (workspace_id, month_key)
  do update
    set runs_count = public.usage_counters.runs_count + 1,
        updated_at = now()
  returning runs_count into v_runs_count;

  return v_runs_count;
end;
$$;

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_agent_types_slug_active on public.agent_types(slug, is_active);
create index if not exists idx_agent_runs_workspace_created on public.agent_runs(workspace_id, created_at desc);
create index if not exists idx_agent_runs_user_created on public.agent_runs(user_id, created_at desc);
create index if not exists idx_saved_outputs_workspace_created on public.saved_outputs(workspace_id, created_at desc);
create index if not exists idx_subscriptions_workspace on public.subscriptions(workspace_id);
create index if not exists idx_usage_counters_workspace_month on public.usage_counters(workspace_id, month_key);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.agent_types enable row level security;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_members_updated_at on public.workspace_members;
create trigger set_workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_types_updated_at on public.agent_types;
create trigger set_agent_types_updated_at
before update on public.agent_types
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_runs_updated_at on public.agent_runs;
create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_saved_outputs_updated_at on public.saved_outputs;
create trigger set_saved_outputs_updated_at
before update on public.saved_outputs
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_usage_counters_updated_at on public.usage_counters;
create trigger set_usage_counters_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists workspaces_read_member on public.workspaces;
create policy workspaces_read_member on public.workspaces
for select to authenticated
using (public.is_workspace_member(id));

drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner on public.workspaces
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner on public.workspaces
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists workspace_members_read_member on public.workspace_members;
create policy workspace_members_read_member on public.workspace_members
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert to authenticated
with check (user_id = auth.uid() or public.is_workspace_owner(workspace_id));

drop policy if exists agent_types_read_active on public.agent_types;
create policy agent_types_read_active on public.agent_types
for select to authenticated
using (is_active = true);

drop policy if exists agent_runs_read_member on public.agent_runs;
create policy agent_runs_read_member on public.agent_runs
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists agent_runs_insert_member on public.agent_runs;
create policy agent_runs_insert_member on public.agent_runs
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists saved_outputs_read_member on public.saved_outputs;
create policy saved_outputs_read_member on public.saved_outputs
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists saved_outputs_insert_member on public.saved_outputs;
create policy saved_outputs_insert_member on public.saved_outputs
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists subscriptions_read_member on public.subscriptions;
create policy subscriptions_read_member on public.subscriptions
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists subscriptions_insert_owner on public.subscriptions;
create policy subscriptions_insert_owner on public.subscriptions
for insert to authenticated
with check (public.is_workspace_owner(workspace_id));

drop policy if exists usage_counters_read_member on public.usage_counters;
create policy usage_counters_read_member on public.usage_counters
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists usage_counters_insert_member on public.usage_counters;
create policy usage_counters_insert_member on public.usage_counters
for insert to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists usage_counters_update_member on public.usage_counters;
create policy usage_counters_update_member on public.usage_counters
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
