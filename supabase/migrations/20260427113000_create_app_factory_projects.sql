create table if not exists public.app_factory_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  prompt text not null,
  app_type text not null,
  project_summary text not null,
  blueprint jsonb not null default '{}'::jsonb,
  migration_plan text[] not null default '{}'::text[],
  pwa_enabled boolean not null default false,
  repo_url text not null,
  preview_url text not null,
  status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_factory_projects_workspace_created_at
  on public.app_factory_projects (workspace_id, created_at desc);

create index if not exists idx_app_factory_projects_user_created_at
  on public.app_factory_projects (user_id, created_at desc);

alter table public.app_factory_projects enable row level security;

create policy "app_factory_projects_select_own"
on public.app_factory_projects
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = app_factory_projects.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "app_factory_projects_insert_own"
on public.app_factory_projects
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = app_factory_projects.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "app_factory_projects_update_own"
on public.app_factory_projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_app_factory_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_app_factory_projects_updated_at on public.app_factory_projects;

create trigger trg_touch_app_factory_projects_updated_at
before update on public.app_factory_projects
for each row
execute procedure public.touch_app_factory_projects_updated_at();
