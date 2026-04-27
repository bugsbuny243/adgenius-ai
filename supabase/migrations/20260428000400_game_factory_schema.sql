-- Game Factory schema

create table if not exists public.unity_game_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  slug text,
  status text not null default 'draft',
  unity_project_id text,
  unity_cloud_project_id text,
  unity_build_target_id text,
  github_repo_owner text,
  github_repo_name text,
  github_branch text,
  package_name text,
  platform text not null default 'android',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  prompt text,
  game_type text,
  target_platform text not null default 'android',
  design_json jsonb not null default '{}'::jsonb,
  requirements_json jsonb not null default '{}'::jsonb,
  ai_provider text,
  model text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid references public.unity_game_projects(id) on delete set null,
  game_brief_id uuid references public.game_briefs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unity_build_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'queued',
  build_target_id text,
  unity_build_number text,
  unity_build_guid text,
  unity_cloud_build_id text,
  commit_sha text,
  artifact_url text,
  artifact_type text not null default 'aab',
  logs_url text,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  build_job_id uuid references public.unity_build_jobs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  artifact_type text not null default 'aab',
  file_url text,
  storage_bucket text,
  storage_path text,
  file_name text,
  file_size_bytes bigint,
  checksum_sha256 text,
  version_code integer,
  version_name text,
  status text not null default 'ready',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(build_job_id, artifact_type)
);

create table if not exists public.game_release_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  artifact_id uuid references public.game_artifacts(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'google_play',
  status text not null default 'queued',
  track text not null default 'internal',
  package_name text,
  release_name text,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  provider_response jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_release_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  release_job_id uuid not null references public.game_release_jobs(id) on delete cascade,
  event_type text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- compatibility table retained if runtime still references legacy job name
create table if not exists public.game_build_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid references public.unity_game_projects(id) on delete cascade,
  status text not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ugp_workspace_id on public.unity_game_projects (workspace_id);
create index if not exists idx_ugp_user_id on public.unity_game_projects (user_id);
create index if not exists idx_ugp_slug on public.unity_game_projects (slug);
create index if not exists idx_game_briefs_workspace_id on public.game_briefs (workspace_id);
create index if not exists idx_game_briefs_project_id on public.game_briefs (unity_game_project_id);
create index if not exists idx_game_generation_jobs_workspace_status on public.game_generation_jobs (workspace_id, status);
create index if not exists idx_unity_build_jobs_workspace_status on public.unity_build_jobs (workspace_id, status);
create index if not exists idx_unity_build_jobs_project_id on public.unity_build_jobs (unity_game_project_id);
create index if not exists idx_unity_build_jobs_created_at_desc on public.unity_build_jobs (created_at desc);
create index if not exists idx_game_artifacts_workspace_id on public.game_artifacts (workspace_id);
create index if not exists idx_game_artifacts_project_id on public.game_artifacts (unity_game_project_id);
create index if not exists idx_game_artifacts_build_job_id on public.game_artifacts (build_job_id);
create index if not exists idx_game_release_jobs_workspace_status on public.game_release_jobs (workspace_id, status);
create index if not exists idx_game_release_jobs_project_id on public.game_release_jobs (unity_game_project_id);
create index if not exists idx_game_release_events_release_job_id on public.game_release_events (release_job_id);
create index if not exists idx_game_release_events_created_at_desc on public.game_release_events (created_at desc);

drop trigger if exists trg_unity_game_projects_updated_at on public.unity_game_projects;
create trigger trg_unity_game_projects_updated_at before update on public.unity_game_projects for each row execute function public.touch_updated_at();
drop trigger if exists trg_game_briefs_updated_at on public.game_briefs;
create trigger trg_game_briefs_updated_at before update on public.game_briefs for each row execute function public.touch_updated_at();
drop trigger if exists trg_game_generation_jobs_updated_at on public.game_generation_jobs;
create trigger trg_game_generation_jobs_updated_at before update on public.game_generation_jobs for each row execute function public.touch_updated_at();
drop trigger if exists trg_unity_build_jobs_updated_at on public.unity_build_jobs;
create trigger trg_unity_build_jobs_updated_at before update on public.unity_build_jobs for each row execute function public.touch_updated_at();
drop trigger if exists trg_game_artifacts_updated_at on public.game_artifacts;
create trigger trg_game_artifacts_updated_at before update on public.game_artifacts for each row execute function public.touch_updated_at();
drop trigger if exists trg_game_release_jobs_updated_at on public.game_release_jobs;
create trigger trg_game_release_jobs_updated_at before update on public.game_release_jobs for each row execute function public.touch_updated_at();
drop trigger if exists trg_game_build_jobs_updated_at on public.game_build_jobs;
create trigger trg_game_build_jobs_updated_at before update on public.game_build_jobs for each row execute function public.touch_updated_at();

select pg_notify('pgrst', 'reload schema');
