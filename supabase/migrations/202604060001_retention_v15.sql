alter table public.profiles
  add column if not exists first_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists total_runs integer not null default 0,
  add column if not exists total_saved_outputs integer not null default 0,
  add column if not exists favorite_agent_count integer not null default 0;

create table if not exists public.favorite_agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid not null references public.agent_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id, agent_type_id)
);

alter table public.favorite_agents enable row level security;

create index if not exists idx_favorite_agents_workspace_user on public.favorite_agents(workspace_id, user_id);
create index if not exists idx_favorite_agents_agent_type on public.favorite_agents(agent_type_id);

alter table public.saved_outputs
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists project_name text;

create index if not exists idx_saved_outputs_favorite on public.saved_outputs(workspace_id, user_id, is_favorite);
create index if not exists idx_saved_outputs_tags on public.saved_outputs using gin(tags);
create index if not exists idx_saved_outputs_project_name on public.saved_outputs(workspace_id, project_name);

create or replace function public.refresh_profile_metrics(p_user_id uuid, p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_runs integer;
  v_first_run timestamptz;
  v_last_run timestamptz;
  v_total_saved integer;
  v_favorite_agents integer;
begin
  select count(*), min(created_at), max(created_at)
  into v_total_runs, v_first_run, v_last_run
  from public.agent_runs
  where user_id = p_user_id
    and workspace_id = p_workspace_id;

  select count(*)
  into v_total_saved
  from public.saved_outputs
  where user_id = p_user_id
    and workspace_id = p_workspace_id;

  select count(*)
  into v_favorite_agents
  from public.favorite_agents
  where user_id = p_user_id
    and workspace_id = p_workspace_id;

  update public.profiles
  set first_run_at = v_first_run,
      last_run_at = v_last_run,
      total_runs = coalesce(v_total_runs, 0),
      total_saved_outputs = coalesce(v_total_saved, 0),
      favorite_agent_count = coalesce(v_favorite_agents, 0),
      updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.refresh_profile_metrics(uuid, uuid) to authenticated;

drop policy if exists favorite_agents_read_member on public.favorite_agents;
create policy favorite_agents_read_member on public.favorite_agents
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists favorite_agents_insert_own on public.favorite_agents;
create policy favorite_agents_insert_own on public.favorite_agents
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists favorite_agents_delete_own on public.favorite_agents;
create policy favorite_agents_delete_own on public.favorite_agents
for delete to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
