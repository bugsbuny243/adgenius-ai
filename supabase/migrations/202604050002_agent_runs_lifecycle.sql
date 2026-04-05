alter table public.agent_runs
  alter column model_name set default 'ai-standard';

alter table public.agent_runs
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.agent_runs
  drop constraint if exists agent_runs_status_check;

alter table public.agent_runs
  add constraint agent_runs_status_check check (
    status in ('pending', 'running', 'completed', 'failed')
  );

drop policy if exists agent_runs_update_member on public.agent_runs;
create policy agent_runs_update_member on public.agent_runs
for update to authenticated
using (
  exists (
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
