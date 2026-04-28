-- Advanced infrastructure and budget intake for custom-scope projects

create table if not exists public.advanced_project_intakes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.unity_game_projects(id) on delete set null,
  project_type text not null,
  desired_scope text not null,
  existing_infrastructure jsonb not null default '{}'::jsonb,
  budget_json jsonb not null default '{}'::jsonb,
  target_scale_json jsonb not null default '{}'::jsonb,
  required_features jsonb not null default '[]'::jsonb,
  generated_scope jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advanced_project_intakes_workspace_id on public.advanced_project_intakes(workspace_id);
create index if not exists idx_advanced_project_intakes_user_id on public.advanced_project_intakes(user_id);
create index if not exists idx_advanced_project_intakes_project_id on public.advanced_project_intakes(project_id);
