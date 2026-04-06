create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  default_prompt text not null,
  tags text[] not null default '{}',
  is_public boolean not null default false,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_public <> is_private)
);

create table if not exists public.template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  title text not null,
  prompt_override text,
  agent_type_id uuid references public.agent_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, step_order)
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  title text not null,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  prompt_template text not null,
  requires_approval boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_mode text not null default 'manual' check (trigger_mode in ('manual', 'scheduled')),
  status text not null default 'running' check (status in ('running', 'pending_approval', 'completed', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_step_id uuid not null references public.workflow_steps(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  status text not null default 'pending' check (status in ('pending', 'running', 'pending_approval', 'approved', 'rejected', 'completed', 'failed')),
  input_payload jsonb,
  output_text text,
  rejection_note text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_run_id, step_order)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  workflow_id uuid references public.workflows(id) on delete cascade,
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'manual')),
  next_run_at timestamptz,
  last_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    ((template_id is not null)::int + (workflow_id is not null)::int) = 1
  )
);

create index if not exists idx_templates_workspace_created on public.templates(workspace_id, created_at desc);
create index if not exists idx_templates_workspace_visibility on public.templates(workspace_id, is_public, created_at desc);
create index if not exists idx_template_steps_template_order on public.template_steps(template_id, step_order);
create index if not exists idx_workflows_workspace_created on public.workflows(workspace_id, created_at desc);
create index if not exists idx_workflow_steps_workflow_order on public.workflow_steps(workflow_id, step_order);
create index if not exists idx_workflow_runs_workflow_started on public.workflow_runs(workflow_id, started_at desc);
create index if not exists idx_workflow_runs_workspace_status on public.workflow_runs(workspace_id, status, started_at desc);
create index if not exists idx_workflow_run_steps_run_order on public.workflow_run_steps(workflow_run_id, step_order);
create index if not exists idx_workflow_run_steps_status on public.workflow_run_steps(status, created_at desc);
create index if not exists idx_schedules_workspace_next on public.schedules(workspace_id, is_active, next_run_at);

alter table public.templates enable row level security;
alter table public.template_steps enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;
alter table public.schedules enable row level security;

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

drop trigger if exists set_template_steps_updated_at on public.template_steps;
create trigger set_template_steps_updated_at
before update on public.template_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_workflows_updated_at on public.workflows;
create trigger set_workflows_updated_at
before update on public.workflows
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_steps_updated_at on public.workflow_steps;
create trigger set_workflow_steps_updated_at
before update on public.workflow_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_runs_updated_at on public.workflow_runs;
create trigger set_workflow_runs_updated_at
before update on public.workflow_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_run_steps_updated_at on public.workflow_run_steps;
create trigger set_workflow_run_steps_updated_at
before update on public.workflow_run_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_schedules_updated_at on public.schedules;
create trigger set_schedules_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

drop policy if exists templates_read_workspace on public.templates;
create policy templates_read_workspace on public.templates
for select to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (is_public = true or user_id = auth.uid())
);

drop policy if exists templates_insert_member on public.templates;
create policy templates_insert_member on public.templates
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists templates_update_owner on public.templates;
create policy templates_update_owner on public.templates
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists template_steps_read_workspace on public.template_steps;
create policy template_steps_read_workspace on public.template_steps
for select to authenticated
using (
  exists (
    select 1
    from public.templates t
    where t.id = template_id
      and public.is_workspace_member(t.workspace_id)
      and (t.is_public = true or t.user_id = auth.uid())
  )
);

drop policy if exists template_steps_insert_owner on public.template_steps;
create policy template_steps_insert_owner on public.template_steps
for insert to authenticated
with check (
  exists (
    select 1
    from public.templates t
    where t.id = template_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
);

drop policy if exists template_steps_update_owner on public.template_steps;
create policy template_steps_update_owner on public.template_steps
for update to authenticated
using (
  exists (
    select 1
    from public.templates t
    where t.id = template_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.templates t
    where t.id = template_id
      and t.user_id = auth.uid()
      and public.is_workspace_member(t.workspace_id)
  )
);

drop policy if exists workflows_read_workspace on public.workflows;
create policy workflows_read_workspace on public.workflows
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workflows_insert_member on public.workflows;
create policy workflows_insert_member on public.workflows
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists workflows_update_owner on public.workflows;
create policy workflows_update_owner on public.workflows
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists workflow_steps_read_workspace on public.workflow_steps;
create policy workflow_steps_read_workspace on public.workflow_steps
for select to authenticated
using (
  exists (
    select 1
    from public.workflows w
    where w.id = workflow_id
      and public.is_workspace_member(w.workspace_id)
  )
);

drop policy if exists workflow_steps_insert_owner on public.workflow_steps;
create policy workflow_steps_insert_owner on public.workflow_steps
for insert to authenticated
with check (
  exists (
    select 1
    from public.workflows w
    where w.id = workflow_id
      and w.user_id = auth.uid()
      and public.is_workspace_member(w.workspace_id)
  )
);

drop policy if exists workflow_steps_update_owner on public.workflow_steps;
create policy workflow_steps_update_owner on public.workflow_steps
for update to authenticated
using (
  exists (
    select 1
    from public.workflows w
    where w.id = workflow_id
      and w.user_id = auth.uid()
      and public.is_workspace_member(w.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.workflows w
    where w.id = workflow_id
      and w.user_id = auth.uid()
      and public.is_workspace_member(w.workspace_id)
  )
);

drop policy if exists workflow_runs_read_workspace on public.workflow_runs;
create policy workflow_runs_read_workspace on public.workflow_runs
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workflow_runs_insert_member on public.workflow_runs;
create policy workflow_runs_insert_member on public.workflow_runs
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists workflow_runs_update_member on public.workflow_runs;
create policy workflow_runs_update_member on public.workflow_runs
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists workflow_run_steps_read_workspace on public.workflow_run_steps;
create policy workflow_run_steps_read_workspace on public.workflow_run_steps
for select to authenticated
using (
  exists (
    select 1
    from public.workflow_runs wr
    where wr.id = workflow_run_id
      and public.is_workspace_member(wr.workspace_id)
  )
);

drop policy if exists workflow_run_steps_insert_member on public.workflow_run_steps;
create policy workflow_run_steps_insert_member on public.workflow_run_steps
for insert to authenticated
with check (
  exists (
    select 1
    from public.workflow_runs wr
    where wr.id = workflow_run_id
      and wr.user_id = auth.uid()
      and public.is_workspace_member(wr.workspace_id)
  )
);

drop policy if exists workflow_run_steps_update_member on public.workflow_run_steps;
create policy workflow_run_steps_update_member on public.workflow_run_steps
for update to authenticated
using (
  exists (
    select 1
    from public.workflow_runs wr
    where wr.id = workflow_run_id
      and public.is_workspace_member(wr.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.workflow_runs wr
    where wr.id = workflow_run_id
      and public.is_workspace_member(wr.workspace_id)
  )
);

drop policy if exists schedules_read_workspace on public.schedules;
create policy schedules_read_workspace on public.schedules
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists schedules_insert_member on public.schedules;
create policy schedules_insert_member on public.schedules
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists schedules_update_owner on public.schedules;
create policy schedules_update_owner on public.schedules
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
