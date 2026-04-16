-- Schema hardening and future-proof additive migration.
-- Goals:
--   * additive + backward-compatible
--   * safe to re-run
--   * no status columns for projects/project_items

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

-- ---------------------------------------------------------------------------
-- agent_runs
-- ---------------------------------------------------------------------------
alter table if exists public.agent_runs
  add column if not exists processing_started_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists editor_state jsonb,
  add column if not exists derived_prompt text;

create index if not exists idx_agent_runs_workspace_status_created_at
  on public.agent_runs (workspace_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- content_items: columns, FK, indexes, updated_at trigger, RLS
-- ---------------------------------------------------------------------------
alter table if exists public.content_items
  add column if not exists updated_at timestamptz not null default now();

-- FKs (idempotent via pg_constraint checks)
do $$
begin
  if to_regclass('public.content_items') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_project_id_fkey'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_run_id_fkey'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_run_id_fkey
      foreign key (run_id) references public.agent_runs(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_saved_output_id_fkey'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_saved_output_id_fkey
      foreign key (saved_output_id) references public.saved_outputs(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'content_items_workspace_id_fkey'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_content_items_project_id on public.content_items (project_id);
create index if not exists idx_content_items_run_id on public.content_items (run_id);
create index if not exists idx_content_items_saved_output_id on public.content_items (saved_output_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_content_items_updated_at ON public.content_items;
create trigger trg_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- publish_jobs: columns, FK, indexes, updated_at trigger, RLS
-- ---------------------------------------------------------------------------
alter table if exists public.publish_jobs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists attempt_count integer not null default 0,
  add column if not exists error_message text,
  add column if not exists provider_job_id text,
  add column if not exists provider_post_id text,
  add column if not exists published_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

do $$
begin
  if to_regclass('public.publish_jobs') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publish_jobs_project_id_fkey'
      and conrelid = 'public.publish_jobs'::regclass
  ) then
    alter table public.publish_jobs
      add constraint publish_jobs_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publish_jobs_content_output_id_fkey'
      and conrelid = 'public.publish_jobs'::regclass
  ) then
    alter table public.publish_jobs
      add constraint publish_jobs_content_output_id_fkey
      foreign key (content_output_id) references public.content_items(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'publish_jobs_workspace_id_fkey'
      and conrelid = 'public.publish_jobs'::regclass
  ) then
    alter table public.publish_jobs
      add constraint publish_jobs_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_publish_jobs_status on public.publish_jobs (status);
create index if not exists idx_publish_jobs_project_id on public.publish_jobs (project_id);
create index if not exists idx_publish_jobs_content_output_id on public.publish_jobs (content_output_id);

DROP TRIGGER IF EXISTS trg_publish_jobs_updated_at ON public.publish_jobs;
create trigger trg_publish_jobs_updated_at
before update on public.publish_jobs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------------
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
  constraint platform_connections_status_check
    check (status in ('disconnected', 'connected', 'expired', 'error', 'revoked')),
  constraint platform_connections_workspace_id_fkey
    foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint platform_connections_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade
);

create index if not exists idx_platform_connections_workspace_created_at
  on public.platform_connections (workspace_id, created_at desc);
create index if not exists idx_platform_connections_workspace_platform
  on public.platform_connections (workspace_id, platform);

DROP TRIGGER IF EXISTS trg_platform_connections_updated_at ON public.platform_connections;
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
  constraint content_assets_workspace_id_fkey
    foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint content_assets_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint content_assets_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete set null,
  constraint content_assets_content_item_id_fkey
    foreign key (content_item_id) references public.content_items(id) on delete set null
);

create index if not exists idx_content_assets_workspace_created_at
  on public.content_assets (workspace_id, created_at desc);
create index if not exists idx_content_assets_content_item_id
  on public.content_assets (content_item_id);

DROP TRIGGER IF EXISTS trg_content_assets_updated_at ON public.content_assets;
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
  constraint publish_job_attempts_publish_job_id_fkey
    foreign key (publish_job_id) references public.publish_jobs(id) on delete cascade
);

create index if not exists idx_publish_job_attempts_publish_job_id_created_at
  on public.publish_job_attempts (publish_job_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_workspace_id_fkey
    foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint audit_logs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null
);

create index if not exists idx_audit_logs_workspace_created_at
  on public.audit_logs (workspace_id, created_at desc);
create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- RLS + workspace-member policies
-- (No CREATE POLICY IF NOT EXISTS; use guarded DO blocks)
-- ---------------------------------------------------------------------------
alter table if exists public.content_items enable row level security;
alter table if exists public.publish_jobs enable row level security;
alter table if exists public.platform_connections enable row level security;
alter table if exists public.content_assets enable row level security;
alter table if exists public.publish_job_attempts enable row level security;
alter table if exists public.audit_logs enable row level security;

do $$
begin
  if to_regclass('public.content_items') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content_items' and policyname = 'content_items_member_select'
  ) then
    create policy content_items_member_select on public.content_items
      for select
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.content_items') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content_items' and policyname = 'content_items_member_insert'
  ) then
    create policy content_items_member_insert on public.content_items
      for insert
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.content_items') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content_items' and policyname = 'content_items_member_update'
  ) then
    create policy content_items_member_update on public.content_items
      for update
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.content_items') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content_items' and policyname = 'content_items_member_delete'
  ) then
    create policy content_items_member_delete on public.content_items
      for delete
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_items.workspace_id and wm.user_id = auth.uid()
      ));
  end if;
end
$$;

do $$
begin
  if to_regclass('public.publish_jobs') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'publish_jobs' and policyname = 'publish_jobs_member_select'
  ) then
    create policy publish_jobs_member_select on public.publish_jobs
      for select
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.publish_jobs') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'publish_jobs' and policyname = 'publish_jobs_member_insert'
  ) then
    create policy publish_jobs_member_insert on public.publish_jobs
      for insert
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.publish_jobs') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'publish_jobs' and policyname = 'publish_jobs_member_update'
  ) then
    create policy publish_jobs_member_update on public.publish_jobs
      for update
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.publish_jobs') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'publish_jobs' and policyname = 'publish_jobs_member_delete'
  ) then
    create policy publish_jobs_member_delete on public.publish_jobs
      for delete
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = publish_jobs.workspace_id and wm.user_id = auth.uid()
      ));
  end if;
end
$$;

do $$
begin
  if to_regclass('public.platform_connections') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_connections' and policyname = 'platform_connections_member_all'
  ) then
    create policy platform_connections_member_all on public.platform_connections
      for all
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = platform_connections.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.content_assets') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content_assets' and policyname = 'content_assets_member_all'
  ) then
    create policy content_assets_member_all on public.content_assets
      for all
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = content_assets.workspace_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.publish_job_attempts') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'publish_job_attempts' and policyname = 'publish_job_attempts_member_all'
  ) then
    create policy publish_job_attempts_member_all on public.publish_job_attempts
      for all
      using (exists (
        select 1
        from public.publish_jobs pj
        join public.workspace_members wm on wm.workspace_id = pj.workspace_id
        where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1
        from public.publish_jobs pj
        join public.workspace_members wm on wm.workspace_id = pj.workspace_id
        where pj.id = publish_job_attempts.publish_job_id and wm.user_id = auth.uid()
      ));
  end if;

  if to_regclass('public.audit_logs') is not null and not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'audit_logs_member_all'
  ) then
    create policy audit_logs_member_all on public.audit_logs
      for all
      using (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid()
      ));
  end if;
end
$$;
