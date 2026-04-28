-- Existing schema compatibility patch (additive only)

alter table if exists public.game_artifacts add column if not exists workspace_id uuid references public.workspaces(id);
alter table if exists public.game_artifacts add column if not exists user_id uuid references auth.users(id);
alter table if exists public.game_artifacts add column if not exists unity_game_project_id uuid references public.unity_game_projects(id);
alter table if exists public.game_artifacts add column if not exists unity_build_job_id uuid references public.unity_build_jobs(id);
alter table if exists public.game_artifacts add column if not exists storage_bucket text;
alter table if exists public.game_artifacts add column if not exists storage_path text;
alter table if exists public.game_artifacts add column if not exists checksum_sha256 text;
alter table if exists public.game_artifacts add column if not exists version_code integer;
alter table if exists public.game_artifacts add column if not exists version_name text;
alter table if exists public.game_artifacts add column if not exists status text default 'ready';
alter table if exists public.game_artifacts add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.game_artifacts add column if not exists updated_at timestamptz default now();

create index if not exists idx_game_artifacts_workspace_id on public.game_artifacts(workspace_id);
create index if not exists idx_game_artifacts_unity_game_project_id on public.game_artifacts(unity_game_project_id);
create index if not exists idx_game_artifacts_unity_build_job_id on public.game_artifacts(unity_build_job_id);
create unique index if not exists uq_game_artifacts_unity_build_job_artifact_type on public.game_artifacts(unity_build_job_id, artifact_type) where unity_build_job_id is not null;

alter table if exists public.game_projects add column if not exists workspace_id uuid references public.workspaces(id);
alter table if exists public.game_projects add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.game_projects add column if not exists approval_status text default 'draft';
alter table if exists public.game_projects add column if not exists last_build_job_id uuid;
alter table if exists public.game_projects add column if not exists last_artifact_id uuid;
alter table if exists public.game_projects add column if not exists last_release_job_id uuid;

update public.game_projects gp
set workspace_id = w.id
from public.workspaces w
where gp.workspace_id is null
  and gp.user_id = w.owner_id;

alter table if exists public.unity_build_jobs add column if not exists user_id uuid references auth.users(id);
alter table if exists public.unity_build_jobs add column if not exists unity_build_number text;
alter table if exists public.unity_build_jobs add column if not exists unity_build_guid text;
alter table if exists public.unity_build_jobs add column if not exists unity_cloud_build_id text;
alter table if exists public.unity_build_jobs add column if not exists external_build_id text;
alter table if exists public.unity_build_jobs add column if not exists commit_sha text;
alter table if exists public.unity_build_jobs add column if not exists logs_url text;
alter table if exists public.unity_build_jobs add column if not exists provider text default 'unity_cloud_build';
alter table if exists public.unity_build_jobs add column if not exists idempotency_key text;

alter table if exists public.user_integrations add column if not exists workspace_id uuid references public.workspaces(id);
alter table if exists public.user_integrations add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.user_integrations add column if not exists provider_account_id text;
alter table if exists public.user_integrations add column if not exists last_used_at timestamptz;

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_integration_id uuid references public.user_integrations(id) on delete cascade,
  provider text not null,
  credential_type text not null,
  encrypted_payload text,
  vault_secret_id uuid,
  key_version text,
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_integration_credentials_user_integration_id on public.integration_credentials(user_integration_id);
create index if not exists idx_integration_credentials_workspace_id on public.integration_credentials(workspace_id);

create or replace view public.user_integrations_public as
select
  ui.id,
  ui.workspace_id,
  ui.user_id,
  ui.provider,
  ui.display_name,
  ui.provider_account_id,
  ui.service_account_email,
  ui.default_track,
  ui.status,
  ui.last_validated_at,
  ui.last_used_at,
  ui.metadata,
  ui.created_at,
  ui.updated_at
from public.user_integrations ui;

select pg_notify('pgrst', 'reload schema');
