create extension if not exists pgcrypto;

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
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('owner', 'member'))
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
  model_name text not null default 'koschei-text-v1',
  result_text text,
  status text not null default 'completed',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runs_status_check check (status in ('pending', 'completed', 'failed')),
  constraint agent_runs_tokens_input_check check (tokens_input >= 0),
  constraint agent_runs_tokens_output_check check (tokens_output >= 0)
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_run_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null default 'free',
  run_limit integer not null default 30,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_name_check check (plan_name in ('free', 'starter', 'pro')),
  constraint subscriptions_status_check check (status in ('active', 'cancelled', 'past_due')),
  constraint subscriptions_run_limit_check check (run_limit > 0)
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key),
  constraint usage_counters_runs_count_check check (runs_count >= 0),
  constraint usage_counters_month_key_check check (month_key ~ '^\d{4}-\d{2}$')
);

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
security definer
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.workspaces
    where id = p_workspace_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.increment_usage_counter(
  p_workspace_id uuid,
  p_month_key text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  insert into public.usage_counters (workspace_id, month_key, runs_count)
  values (p_workspace_id, p_month_key, 1)
  on conflict (workspace_id, month_key)
  do update set
    runs_count = usage_counters.runs_count + 1,
    updated_at = now()
  returning runs_count into v_count;

  return v_count;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists trg_workspace_members_updated_at on public.workspace_members;
create trigger trg_workspace_members_updated_at
before update on public.workspace_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_types_updated_at on public.agent_types;
create trigger trg_agent_types_updated_at
before update on public.agent_types
for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_runs_updated_at on public.agent_runs;
create trigger trg_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

drop trigger if exists trg_saved_outputs_updated_at on public.saved_outputs;
create trigger trg_saved_outputs_updated_at
before update on public.saved_outputs
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_usage_counters_updated_at on public.usage_counters;
create trigger trg_usage_counters_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists ix_workspaces_slug on public.workspaces(slug);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_agent_types_slug_active on public.agent_types(slug, is_active);
create index if not exists ix_agent_runs_user_id on public.agent_runs(user_id);
create index if not exists ix_agent_runs_workspace_id on public.agent_runs(workspace_id);
create index if not exists ix_agent_runs_created_at on public.agent_runs(created_at desc);
create index if not exists ix_agent_runs_agent_type_id on public.agent_runs(agent_type_id);
create index if not exists ix_saved_outputs_user_id on public.saved_outputs(user_id);
create index if not exists ix_saved_outputs_workspace_id on public.saved_outputs(workspace_id);
create index if not exists ix_saved_outputs_created_at on public.saved_outputs(created_at desc);
create index if not exists ix_saved_outputs_agent_run_id on public.saved_outputs(agent_run_id);
create index if not exists idx_subscriptions_workspace on public.subscriptions(workspace_id);
create index if not exists ix_usage_counters_workspace_id on public.usage_counters(workspace_id);
create index if not exists ix_usage_counters_month_key on public.usage_counters(month_key);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.agent_types enable row level security;

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
using (public.is_workspace_owner(id))
with check (owner_id = auth.uid());

drop policy if exists workspace_members_read_member on public.workspace_members;
create policy workspace_members_read_member on public.workspace_members
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert to authenticated
with check (
  user_id = auth.uid()
  or public.is_workspace_owner(workspace_id)
);

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

drop policy if exists agent_runs_update_member on public.agent_runs;
create policy agent_runs_update_member on public.agent_runs
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists saved_outputs_read_member on public.saved_outputs;
create policy saved_outputs_read_member on public.saved_outputs
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists saved_outputs_insert_member on public.saved_outputs;
create policy saved_outputs_insert_member on public.saved_outputs
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists saved_outputs_delete_member on public.saved_outputs;
create policy saved_outputs_delete_member on public.saved_outputs
for delete to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists subscriptions_read_member on public.subscriptions;
create policy subscriptions_read_member on public.subscriptions
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists subscriptions_insert_owner on public.subscriptions;
create policy subscriptions_insert_owner on public.subscriptions
for insert to authenticated
with check (public.is_workspace_owner(workspace_id));

drop policy if exists subscriptions_update_owner on public.subscriptions;
create policy subscriptions_update_owner on public.subscriptions
for update to authenticated
using (public.is_workspace_owner(workspace_id))
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
