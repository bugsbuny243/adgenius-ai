alter table public.game_artifacts
add column if not exists unity_build_job_id uuid references public.unity_build_jobs(id),
add column if not exists unity_game_project_id uuid references public.unity_game_projects(id),
add column if not exists workspace_id uuid references public.workspaces(id),
add column if not exists user_id uuid references auth.users(id),
add column if not exists status text default 'ready',
add column if not exists metadata jsonb default '{}'::jsonb,
add column if not exists updated_at timestamptz default now();

create unique index if not exists game_artifacts_unity_build_job_id_artifact_type_key
on public.game_artifacts(unity_build_job_id, artifact_type)
where unity_build_job_id is not null;

notify pgrst, 'reload schema';
