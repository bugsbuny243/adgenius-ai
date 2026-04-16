-- Schema hardening and future-proof additive migration.

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

-- projects: safe index only.
create index if not exists idx_projects_workspace_created_at on public.projects (workspace_id, created_at desc);

-- project_items hardening
alter table if exists public.project_items
  add constraint project_items_item_type_check
  check (item_type in ('note', 'agent_output', 'task', 'link', 'asset')) not valid;
alter table if exists public.project_items validate constraint project_items_item_type_check;
create index if not exists idx_project_items_workspace_project_created_at on public.project_items (workspace_id, project_id, created_at desc);

-- content_items hardening
alter table if exists public.content_items
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.content_items
  add constraint content_items_status_check
  check (status in ('draft', 'generated', 'queued', 'published', 'failed', 'archived')) not valid;
alter table if exists public.content_items validate constraint content_items_status_check;

alter table if exists public.content_items
  add constraint content_items_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;
alter table if exists public.content_items
  add constraint content_items_run_id_fkey
  foreign key (run_id) references public.agent_runs(id) on delete set null;
alter table if exists public.content_items
  add constraint content_items_saved_output_id_fkey
  foreign key (saved_output_id) references public.saved_outputs(id) on delete set null;
alter table if exists public.content_items
  add constraint content_items_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table if exists public.content_items
  add constraint content_items_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists idx_content_items_workspace_created_at on public.content_items (workspace_id, created_at desc);
create index if not exists idx_content_items_project_id on public.content_items (project_id);
create index if not exists idx_content_items_run_id on public.content_items (run_id);
create index if not exists idx_content_items_saved_output_id on public.content_items (saved_output_id);

drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

-- publish_jobs hardening
alter table if exists public.publish_jobs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists attempt_count integer not null default 0,
  add column if not exists error_message text,
  add column if not exists provider_job_id text,
  add column if not exists provider_post_id text,
  add column if not exists published_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

alter table if exists public.publish_jobs
  add constraint publish_jobs_status_check
  check (status in ('draft', 'queued', 'processing', 'published', 'failed', 'cancelled')) not valid;
alter table if exists public.publish_jobs validate constraint publish_jobs_status_check;

alter table if exists public.publish_jobs
  add constraint publish_jobs_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;
alter table if exists public.publish_jobs
  add constraint publish_jobs_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table if exists public.publish_jobs
  add constraint publish_jobs_content_output_id_fkey
  foreign key (content_output_id) references public.content_items(id) on delete set null;

create index if not exists idx_publish_jobs_workspace_created_at on public.publish_jobs (workspace_id, created_at desc);
create index if not exists idx_publish_jobs_status on public.publish_jobs (status);
create index if not exists idx_publish_jobs_project_id on public.publish_jobs (project_id);
create index if not exists idx_publish_jobs_content_output_id on public.publish_jobs (content_output_id);

drop trigger if exists trg_publish_jobs_updated_at on public.publish_jobs;
create trigger trg_publish_jobs_updated_at
before update on public.publish_jobs
for each row execute function public.set_updated_at();

-- agent_runs hardening
alter table if exists public.agent_runs
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists editor_state jsonb,
  add column if not exists derived_prompt text;

alter table if exists public.agent_runs
  add constraint agent_runs_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')) not valid;
alter table if exists public.agent_runs validate constraint agent_runs_status_check;

create index if not exists idx_agent_runs_workspace_status_created_at on public.agent_runs (workspace_id, status, created_at desc);

-- usage/subscription safety checks
alter table if exists public.usage_counters
  alter column month_key set not null;
create index if not exists idx_usage_counters_workspace_month_key on public.usage_counters (workspace_id, month_key);
create index if not exists idx_subscriptions_workspace_status on public.subscriptions (workspace_id, status);

-- New tables
create table if not exists public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  platform text not null,
  connection_name text,
  external_account_id text,
  external_username text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'disconnected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_connections_status_check check (status in ('disconnected', 'connected', 'expired', 'error', 'revoked')),
  constraint platform_connections_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint platform_connections_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);
create index if not exists idx_platform_connections_workspace_created_at on public.platform_connections (workspace_id, created_at desc);
create index if not exists idx_platform_connections_workspace_platform on public.platform_connections (workspace_id, platform);
drop trigger if exists trg_platform_connections_updated_at on public.platform_connections;
create trigger trg_platform_connections_updated_at
before update on public.platform_connections
for each row execute function public.set_updated_at();

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  project_id uuid,
  content_item_id uuid,
  asset_type text not null,
  storage_path text not null,
  mime_type text,
  original_filename text,
  file_size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_assets_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint content_assets_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint content_assets_project_id_fkey foreign key (project_id) references public.projects(id) on delete set null,
  constraint content_assets_content_item_id_fkey foreign key (content_item_id) references public.content_items(id) on delete set null
);
create index if not exists idx_content_assets_workspace_created_at on public.content_assets (workspace_id, created_at desc);
create index if not exists idx_content_assets_content_item_id on public.content_assets (content_item_id);
drop trigger if exists trg_content_assets_updated_at on public.content_assets;
create trigger trg_content_assets_updated_at
before update on public.content_assets
for each row execute function public.set_updated_at();

create table if not exists public.publish_job_attempts (
  id uuid primary key default gen_random_uuid(),
  publish_job_id uuid not null,
  attempt_no integer not null,
  status text not null,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint publish_job_attempts_publish_job_id_fkey foreign key (publish_job_id) references public.publish_jobs(id) on delete cascade
);
create index if not exists idx_publish_job_attempts_publish_job_id_created_at on public.publish_job_attempts (publish_job_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint audit_logs_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null
);
create index if not exists idx_audit_logs_workspace_created_at on public.audit_logs (workspace_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- RLS & policies
alter table if exists public.content_items enable row level security;
alter table if exists public.publish_jobs enable row level security;
alter table if exists public.platform_connections enable row level security;
alter table if exists public.content_assets enable row level security;
alter table if exists public.publish_job_attempts enable row level security;
alter table if exists public.audit_logs enable row level security;

-- content_items policies
create policy if not exists content_items_member_select on public.content_items
for select using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()));
create policy if not exists content_items_member_insert on public.content_items
for insert with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()));
create policy if not exists content_items_owner_update on public.content_items
for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
create policy if not exists content_items_owner_delete on public.content_items
for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

-- publish_jobs policies
create policy if not exists publish_jobs_member_select on public.publish_jobs
for select using (exists (select 1 from public.workspace_members wm where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()));
create policy if not exists publish_jobs_member_insert on public.publish_jobs
for insert with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()));
create policy if not exists publish_jobs_owner_update on public.publish_jobs
for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
create policy if not exists publish_jobs_owner_delete on public.publish_jobs
for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

-- platform_connections policies
create policy if not exists platform_connections_member_select on public.platform_connections
for select using (exists (select 1 from public.workspace_members wm where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid()));
create policy if not exists platform_connections_member_insert on public.platform_connections
for insert with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid()));
create policy if not exists platform_connections_owner_update on public.platform_connections
for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
create policy if not exists platform_connections_owner_delete on public.platform_connections
for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

-- content_assets policies
create policy if not exists content_assets_member_select on public.content_assets
for select using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid()));
create policy if not exists content_assets_member_insert on public.content_assets
for insert with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid()));
create policy if not exists content_assets_owner_update on public.content_assets
for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
create policy if not exists content_assets_owner_delete on public.content_assets
for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

-- publish_job_attempts policies
create policy if not exists publish_job_attempts_member_select on public.publish_job_attempts
for select using (
  exists (
    select 1 from public.publish_jobs pj
    join public.workspace_members wm on wm.workspace_id = pj.workspace_id
    where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid()
  )
);
create policy if not exists publish_job_attempts_member_insert on public.publish_job_attempts
for insert with check (
  exists (
    select 1 from public.publish_jobs pj
    join public.workspace_members wm on wm.workspace_id = pj.workspace_id
    where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid()
  )
);
create policy if not exists publish_job_attempts_owner_update on public.publish_job_attempts
for update using (
  exists (
    select 1 from public.publish_jobs pj
    join public.workspace_members wm on wm.workspace_id = pj.workspace_id
    where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid() and wm.role = 'owner'
  )
);
create policy if not exists publish_job_attempts_owner_delete on public.publish_job_attempts
for delete using (
  exists (
    select 1 from public.publish_jobs pj
    join public.workspace_members wm on wm.workspace_id = pj.workspace_id
    where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid() and wm.role = 'owner'
  )
);

-- audit_logs policies
create policy if not exists audit_logs_member_select on public.audit_logs
for select using (exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid()));
create policy if not exists audit_logs_member_insert on public.audit_logs
for insert with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid()));
create policy if not exists audit_logs_owner_update on public.audit_logs
for update using (exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
create policy if not exists audit_logs_owner_delete on public.audit_logs
for delete using (exists (select 1 from public.workspace_members wm where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));
