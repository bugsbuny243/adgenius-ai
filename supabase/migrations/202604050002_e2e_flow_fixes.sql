alter table public.agent_runs
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.saved_outputs
  add constraint saved_outputs_workspace_user_run_key
  unique (workspace_id, user_id, agent_run_id);

drop policy if exists agent_runs_update_member on public.agent_runs;
create policy agent_runs_update_member on public.agent_runs
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = agent_runs.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = agent_runs.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists saved_outputs_update_member on public.saved_outputs;
create policy saved_outputs_update_member on public.saved_outputs
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = saved_outputs.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = saved_outputs.workspace_id
      and wm.user_id = auth.uid()
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  created_workspace_id uuid;
begin
  workspace_name := coalesce(nullif(trim(split_part(new.email, '@', 1)), ''), 'workspace') || '-workspace';

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;

  insert into public.workspaces (owner_id, name)
  values (new.id, workspace_name)
  returning id into created_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.subscriptions (workspace_id, plan_name, run_limit, status)
  values (created_workspace_id, 'starter', 100, 'active')
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
