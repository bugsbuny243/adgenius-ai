create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  brief text not null,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'archived')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_runs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  selected_memory_item_ids uuid[] not null default '{}',
  selected_attachment_ids uuid[] not null default '{}',
  context_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orchestrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  name text not null,
  description text,
  approval_mode text not null default 'manual' check (approval_mode in ('auto', 'manual', 'stop_on_review')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orchestration_steps (
  id uuid primary key default gen_random_uuid(),
  orchestration_id uuid not null references public.orchestrations(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  name text not null,
  agent_key text not null,
  instructions text,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchestration_id, step_order)
);

create table if not exists public.orchestration_runs (
  id uuid primary key default gen_random_uuid(),
  orchestration_id uuid not null references public.orchestrations(id) on delete cascade,
  goal_run_id uuid references public.goal_runs(id) on delete set null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  current_step_order integer,
  audit_log jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orchestration_run_steps (
  id uuid primary key default gen_random_uuid(),
  orchestration_run_id uuid not null references public.orchestration_runs(id) on delete cascade,
  orchestration_step_id uuid not null references public.orchestration_steps(id) on delete cascade,
  step_order integer not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'waiting_approval', 'approved', 'failed', 'skipped')),
  input_payload jsonb,
  output_payload jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchestration_run_id, step_order)
);

create table if not exists public.project_memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  memory_type text not null check (memory_type in ('output', 'note', 'reference', 'tone_rule', 'constraint')),
  content text not null,
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attachment_type text not null check (attachment_type in ('text_note', 'url_reference', 'file_metadata')),
  title text not null,
  content text,
  source_url text,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachment_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  project_id uuid,
  goal_run_id uuid references public.goal_runs(id) on delete cascade,
  orchestration_run_id uuid references public.orchestration_runs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint attachment_links_target_check check (
    project_id is not null or goal_run_id is not null or orchestration_run_id is not null
  )
);

create table if not exists public.final_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_run_id uuid references public.goal_runs(id) on delete set null,
  orchestration_run_id uuid not null references public.orchestration_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  content_markdown text not null,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_workspace_created on public.goals(workspace_id, created_at desc);
create index if not exists idx_goal_runs_goal_created on public.goal_runs(goal_id, created_at desc);
create index if not exists idx_orchestrations_workspace on public.orchestrations(workspace_id, created_at desc);
create index if not exists idx_orchestration_steps_orch_order on public.orchestration_steps(orchestration_id, step_order);
create index if not exists idx_orchestration_runs_workspace_created on public.orchestration_runs(workspace_id, created_at desc);
create index if not exists idx_orchestration_run_steps_run_order on public.orchestration_run_steps(orchestration_run_id, step_order);
create index if not exists idx_project_memory_workspace_created on public.project_memory_items(workspace_id, created_at desc);
create index if not exists idx_attachments_workspace_created on public.attachments(workspace_id, created_at desc);
create index if not exists idx_attachment_links_attachment on public.attachment_links(attachment_id, created_at desc);
create index if not exists idx_final_deliverables_workspace_created on public.final_deliverables(workspace_id, created_at desc);

alter table public.goals enable row level security;
alter table public.goal_runs enable row level security;
alter table public.orchestrations enable row level security;
alter table public.orchestration_steps enable row level security;
alter table public.orchestration_runs enable row level security;
alter table public.orchestration_run_steps enable row level security;
alter table public.project_memory_items enable row level security;
alter table public.attachments enable row level security;
alter table public.attachment_links enable row level security;
alter table public.final_deliverables enable row level security;

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
drop trigger if exists set_goal_runs_updated_at on public.goal_runs;
create trigger set_goal_runs_updated_at before update on public.goal_runs for each row execute function public.set_updated_at();
drop trigger if exists set_orchestrations_updated_at on public.orchestrations;
create trigger set_orchestrations_updated_at before update on public.orchestrations for each row execute function public.set_updated_at();
drop trigger if exists set_orchestration_steps_updated_at on public.orchestration_steps;
create trigger set_orchestration_steps_updated_at before update on public.orchestration_steps for each row execute function public.set_updated_at();
drop trigger if exists set_orchestration_runs_updated_at on public.orchestration_runs;
create trigger set_orchestration_runs_updated_at before update on public.orchestration_runs for each row execute function public.set_updated_at();
drop trigger if exists set_orchestration_run_steps_updated_at on public.orchestration_run_steps;
create trigger set_orchestration_run_steps_updated_at before update on public.orchestration_run_steps for each row execute function public.set_updated_at();
drop trigger if exists set_project_memory_items_updated_at on public.project_memory_items;
create trigger set_project_memory_items_updated_at before update on public.project_memory_items for each row execute function public.set_updated_at();
drop trigger if exists set_attachments_updated_at on public.attachments;
create trigger set_attachments_updated_at before update on public.attachments for each row execute function public.set_updated_at();
drop trigger if exists set_final_deliverables_updated_at on public.final_deliverables;
create trigger set_final_deliverables_updated_at before update on public.final_deliverables for each row execute function public.set_updated_at();

create policy goals_read_member on public.goals for select to authenticated using (public.is_workspace_member(workspace_id));
create policy goals_insert_member on public.goals for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy goals_update_member on public.goals for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy goal_runs_read_member on public.goal_runs for select to authenticated using (public.is_workspace_member(workspace_id));
create policy goal_runs_insert_member on public.goal_runs for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy goal_runs_update_member on public.goal_runs for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy orchestrations_read_member on public.orchestrations for select to authenticated using (public.is_workspace_member(workspace_id));
create policy orchestrations_insert_member on public.orchestrations for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy orchestrations_update_member on public.orchestrations for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy orchestration_steps_read_member on public.orchestration_steps for select to authenticated using (
  exists (
    select 1 from public.orchestrations o
    where o.id = orchestration_id
      and public.is_workspace_member(o.workspace_id)
  )
);
create policy orchestration_steps_insert_member on public.orchestration_steps for insert to authenticated with check (
  exists (
    select 1 from public.orchestrations o
    where o.id = orchestration_id
      and public.is_workspace_member(o.workspace_id)
  )
);
create policy orchestration_steps_update_member on public.orchestration_steps for update to authenticated using (
  exists (
    select 1 from public.orchestrations o
    where o.id = orchestration_id
      and public.is_workspace_member(o.workspace_id)
  )
) with check (
  exists (
    select 1 from public.orchestrations o
    where o.id = orchestration_id
      and public.is_workspace_member(o.workspace_id)
  )
);

create policy orchestration_runs_read_member on public.orchestration_runs for select to authenticated using (public.is_workspace_member(workspace_id));
create policy orchestration_runs_insert_member on public.orchestration_runs for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy orchestration_runs_update_member on public.orchestration_runs for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy orchestration_run_steps_read_member on public.orchestration_run_steps for select to authenticated using (
  exists (
    select 1 from public.orchestration_runs o
    where o.id = orchestration_run_id
      and public.is_workspace_member(o.workspace_id)
  )
);
create policy orchestration_run_steps_insert_member on public.orchestration_run_steps for insert to authenticated with check (
  exists (
    select 1 from public.orchestration_runs o
    where o.id = orchestration_run_id
      and o.user_id = auth.uid()
      and public.is_workspace_member(o.workspace_id)
  )
);
create policy orchestration_run_steps_update_member on public.orchestration_run_steps for update to authenticated using (
  exists (
    select 1 from public.orchestration_runs o
    where o.id = orchestration_run_id
      and public.is_workspace_member(o.workspace_id)
  )
) with check (
  exists (
    select 1 from public.orchestration_runs o
    where o.id = orchestration_run_id
      and public.is_workspace_member(o.workspace_id)
  )
);

create policy project_memory_items_read_member on public.project_memory_items for select to authenticated using (public.is_workspace_member(workspace_id));
create policy project_memory_items_insert_member on public.project_memory_items for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy project_memory_items_update_member on public.project_memory_items for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy attachments_read_member on public.attachments for select to authenticated using (public.is_workspace_member(workspace_id));
create policy attachments_insert_member on public.attachments for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy attachments_update_member on public.attachments for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy attachment_links_read_member on public.attachment_links for select to authenticated using (public.is_workspace_member(workspace_id));
create policy attachment_links_insert_member on public.attachment_links for insert to authenticated with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

create policy final_deliverables_read_member on public.final_deliverables for select to authenticated using (public.is_workspace_member(workspace_id));
create policy final_deliverables_insert_member on public.final_deliverables for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
