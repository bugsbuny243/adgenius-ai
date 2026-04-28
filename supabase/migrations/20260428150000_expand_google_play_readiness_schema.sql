alter table if exists public.google_play_readiness
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists workspace_id uuid references public.workspaces(id),
  add column if not exists unity_game_project_id uuid references public.unity_game_projects(id) on delete cascade,
  add column if not exists package_name text,
  add column if not exists google_email text,
  add column if not exists has_google_account boolean not null default false,
  add column if not exists has_play_console boolean not null default false,
  add column if not exists has_service_account boolean not null default false,
  add column if not exists service_account_valid boolean not null default false,
  add column if not exists permissions_valid boolean not null default false,
  add column if not exists app_access_valid boolean not null default false,
  add column if not exists status text not null default 'not_connected',
  add column if not exists blockers jsonb not null default '[]'::jsonb,
  add column if not exists checked_at timestamptz;

update public.google_play_readiness
set unity_game_project_id = coalesce(unity_game_project_id, project_id)
where unity_game_project_id is null
  and project_id is not null;

create unique index if not exists uq_google_play_readiness_unity_game_project_id
  on public.google_play_readiness(unity_game_project_id)
  where unity_game_project_id is not null;

create unique index if not exists uq_google_play_readiness_id on public.google_play_readiness(id);

select pg_notify('pgrst', 'reload schema');
