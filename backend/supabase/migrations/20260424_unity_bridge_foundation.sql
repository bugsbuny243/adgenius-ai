-- Unity bridge foundation (idempotent)

create table if not exists public.unity_game_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  genre text not null,
  description text not null,
  unity_version text,
  supported_platforms text[] not null default array['android'],
  complexity text not null default 'low',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unity_game_templates_complexity_check check (complexity in ('low', 'medium', 'high'))
);

create table if not exists public.unity_game_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  template_id uuid references public.unity_game_templates(id) on delete set null,
  app_name text not null,
  package_name text not null,
  user_prompt text not null,
  game_brief jsonb not null default '{}'::jsonb,
  target_platform text not null default 'android',
  status text not null default 'draft',
  approval_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unity_game_projects_target_platform_check check (target_platform in ('android')),
  constraint unity_game_projects_status_check check (
    status in ('draft', 'planned', 'queued', 'building', 'build_succeeded', 'build_failed', 'ready_for_review', 'approved', 'rejected')
  ),
  constraint unity_game_projects_approval_status_check check (approval_status in ('pending', 'approved', 'rejected'))
);

create table if not exists public.unity_build_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  unity_game_project_id uuid not null references public.unity_game_projects(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  worker_id text,
  unity_version text,
  build_target text not null default 'android',
  build_type text not null default 'development',
  status text not null default 'queued',
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  artifact_type text,
  artifact_url text,
  build_logs text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unity_build_jobs_build_target_check check (build_target in ('android')),
  constraint unity_build_jobs_build_type_check check (build_type in ('development', 'release')),
  constraint unity_build_jobs_status_check check (status in ('queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled')),
  constraint unity_build_jobs_artifact_type_check check (artifact_type in ('apk', 'aab') or artifact_type is null)
);

create index if not exists idx_unity_game_projects_workspace_id on public.unity_game_projects(workspace_id);
create index if not exists idx_unity_build_jobs_workspace_id on public.unity_build_jobs(workspace_id);
create index if not exists idx_unity_build_jobs_project_id on public.unity_build_jobs(unity_game_project_id);
create index if not exists idx_unity_build_jobs_status on public.unity_build_jobs(status);

alter table public.unity_game_templates enable row level security;
alter table public.unity_game_projects enable row level security;
alter table public.unity_build_jobs enable row level security;

drop policy if exists "authenticated users can read unity game templates" on public.unity_game_templates;
create policy "authenticated users can read unity game templates"
on public.unity_game_templates
for select
to authenticated
using (true);

drop policy if exists "workspace member access unity game projects" on public.unity_game_projects;
create policy "workspace member access unity game projects"
on public.unity_game_projects
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "workspace member access unity build jobs" on public.unity_build_jobs;
create policy "workspace member access unity build jobs"
on public.unity_build_jobs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

insert into public.unity_game_templates (slug, title, genre, description, unity_version, supported_platforms, complexity, metadata)
values
  (
    'runner_2d_mobile',
    '2D Endless Runner',
    'runner',
    'Fast-paced side-scrolling endless runner optimized for touch controls and short mobile sessions.',
    '2022.3 LTS',
    array['android'],
    'low',
    jsonb_build_object('camera', 'side', 'session_length_minutes', 3)
  ),
  (
    'quiz_mobile',
    'Mobile Quiz Challenge',
    'quiz',
    'Question-and-answer mobile quiz loop with rounds, streak bonuses, and lightweight progression.',
    '2022.3 LTS',
    array['android'],
    'low',
    jsonb_build_object('mode', 'single_player', 'question_sources', array['local'])
  ),
  (
    'idle_clicker_mobile',
    'Idle Clicker Tycoon',
    'idle',
    'Tap and idle accumulation design with upgrade trees and economy pacing tuned for mobile play.',
    '2022.3 LTS',
    array['android'],
    'medium',
    jsonb_build_object('economy_layers', 2, 'offline_progress', true)
  ),
  (
    'puzzle_match_mobile',
    'Puzzle Match Mobile',
    'puzzle',
    'Grid-based puzzle matching gameplay with increasing stage difficulty and combo mechanics.',
    '2022.3 LTS',
    array['android'],
    'medium',
    jsonb_build_object('grid_default', '8x8', 'move_limit_mode', true)
  ),
  (
    'platformer_2d_mobile',
    '2D Platformer Mobile',
    'platformer',
    'Level-based 2D platformer template with checkpoints, hazards, and touch-friendly controls.',
    '2022.3 LTS',
    array['android'],
    'medium',
    jsonb_build_object('level_style', 'linear', 'checkpoint_system', true)
  )
on conflict (slug) do update
set
  title = excluded.title,
  genre = excluded.genre,
  description = excluded.description,
  unity_version = excluded.unity_version,
  supported_platforms = excluded.supported_platforms,
  complexity = excluded.complexity,
  metadata = excluded.metadata,
  is_active = true,
  updated_at = now();
