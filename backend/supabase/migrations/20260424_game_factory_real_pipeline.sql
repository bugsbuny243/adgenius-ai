-- Game Factory real production pipeline schema

create table if not exists public.game_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'draft',
  game_type text not null default 'runner_2d',
  target_platform text not null default 'android',
  package_name text not null,
  product_name text,
  unity_repo_owner text,
  unity_repo_name text,
  unity_branch text not null default 'main',
  unity_commit_sha text,
  current_version_code integer not null default 1,
  current_version_name text not null default '1.0',
  release_track text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_projects_status_check check (
    status in (
      'draft', 'generating', 'generated', 'committing', 'ready_for_build', 'building', 'build_succeeded',
      'build_failed', 'release_preparing', 'release_ready', 'publishing', 'published', 'publish_failed', 'archived'
    )
  )
);

create unique index if not exists idx_game_projects_user_slug on public.game_projects(user_id, slug);
create index if not exists idx_game_projects_user_status on public.game_projects(user_id, status);

create table if not exists public.game_briefs (
  id uuid primary key default gen_random_uuid(),
  game_project_id uuid not null references public.game_projects(id) on delete cascade,
  prompt text not null,
  generated_summary text,
  gameplay_goals jsonb not null default '[]'::jsonb,
  visual_style text,
  controls text,
  monetization_notes text,
  store_short_description text,
  store_full_description text,
  release_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_briefs_project_id on public.game_briefs(game_project_id);

create table if not exists public.game_build_jobs (
  id uuid primary key default gen_random_uuid(),
  game_project_id uuid not null references public.game_projects(id) on delete cascade,
  provider text not null default 'unity_cloud',
  external_build_id text,
  status text not null default 'queued',
  branch text not null default 'main',
  commit_sha text,
  version_code integer,
  version_name text,
  logs_url text,
  artifact_url text,
  artifact_type text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_build_jobs_status_check check (status in ('queued', 'triggered', 'building', 'succeeded', 'failed', 'canceled'))
);

create index if not exists idx_game_build_jobs_project_id on public.game_build_jobs(game_project_id);
create index if not exists idx_game_build_jobs_status on public.game_build_jobs(status);

create table if not exists public.game_artifacts (
  id uuid primary key default gen_random_uuid(),
  game_project_id uuid not null references public.game_projects(id) on delete cascade,
  build_job_id uuid references public.game_build_jobs(id) on delete cascade,
  artifact_type text not null,
  file_name text,
  file_url text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint game_artifacts_type_check check (artifact_type in ('aab', 'apk', 'build_report', 'logs'))
);

create index if not exists idx_game_artifacts_project_id on public.game_artifacts(game_project_id);

create table if not exists public.game_release_jobs (
  id uuid primary key default gen_random_uuid(),
  game_project_id uuid not null references public.game_projects(id) on delete cascade,
  build_job_id uuid references public.game_build_jobs(id) on delete set null,
  artifact_id uuid references public.game_artifacts(id) on delete set null,
  provider text not null default 'google_play',
  package_name text not null,
  track text not null default 'production',
  status text not null default 'draft',
  edit_id text,
  version_code integer,
  version_name text,
  release_name text,
  release_notes text,
  error_message text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_release_jobs_status_check check (
    status in ('draft', 'awaiting_user_approval', 'preparing', 'uploading', 'uploaded', 'committing', 'published', 'failed', 'blocked_by_platform_requirement')
  )
);

create index if not exists idx_game_release_jobs_project_id on public.game_release_jobs(game_project_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.owns_game_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_projects gp
    where gp.id = _project_id
      and gp.user_id = auth.uid()
  );
$$;

drop trigger if exists trg_game_projects_touch_updated_at on public.game_projects;
create trigger trg_game_projects_touch_updated_at before update on public.game_projects for each row execute function public.touch_updated_at();

drop trigger if exists trg_game_briefs_touch_updated_at on public.game_briefs;
create trigger trg_game_briefs_touch_updated_at before update on public.game_briefs for each row execute function public.touch_updated_at();

drop trigger if exists trg_game_build_jobs_touch_updated_at on public.game_build_jobs;
create trigger trg_game_build_jobs_touch_updated_at before update on public.game_build_jobs for each row execute function public.touch_updated_at();

drop trigger if exists trg_game_release_jobs_touch_updated_at on public.game_release_jobs;
create trigger trg_game_release_jobs_touch_updated_at before update on public.game_release_jobs for each row execute function public.touch_updated_at();

alter table public.game_projects enable row level security;
alter table public.game_briefs enable row level security;
alter table public.game_build_jobs enable row level security;
alter table public.game_artifacts enable row level security;
alter table public.game_release_jobs enable row level security;

drop policy if exists "users own game projects" on public.game_projects;
create policy "users own game projects" on public.game_projects
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users access game briefs by ownership" on public.game_briefs;
create policy "users access game briefs by ownership" on public.game_briefs
for all
using (public.owns_game_project(game_project_id))
with check (public.owns_game_project(game_project_id));

drop policy if exists "users access game builds by ownership" on public.game_build_jobs;
create policy "users access game builds by ownership" on public.game_build_jobs
for all
using (public.owns_game_project(game_project_id))
with check (public.owns_game_project(game_project_id));

drop policy if exists "users access game artifacts by ownership" on public.game_artifacts;
create policy "users access game artifacts by ownership" on public.game_artifacts
for all
using (public.owns_game_project(game_project_id))
with check (public.owns_game_project(game_project_id));

drop policy if exists "users access game releases by ownership" on public.game_release_jobs;
create policy "users access game releases by ownership" on public.game_release_jobs
for all
using (public.owns_game_project(game_project_id))
with check (public.owns_game_project(game_project_id));
