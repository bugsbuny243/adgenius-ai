create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  title text not null,
  item_type text not null default 'saved_output',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace_created on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_project_created on public.project_items(project_id, created_at desc);
create index if not exists idx_project_items_workspace_created on public.project_items(workspace_id, created_at desc);

alter table public.projects enable row level security;
alter table public.project_items enable row level security;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_project_items_updated_at on public.project_items;
create trigger set_project_items_updated_at
before update on public.project_items
for each row execute function public.set_updated_at();

drop policy if exists projects_read_member on public.projects;
create policy projects_read_member on public.projects
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists projects_insert_member on public.projects;
create policy projects_insert_member on public.projects
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner on public.projects
for delete to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists project_items_read_member on public.project_items;
create policy project_items_read_member on public.project_items
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists project_items_insert_member on public.project_items;
create policy project_items_insert_member on public.project_items
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists project_items_update_owner on public.project_items;
create policy project_items_update_owner on public.project_items
for update to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists project_items_delete_owner on public.project_items;
create policy project_items_delete_owner on public.project_items
for delete to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
