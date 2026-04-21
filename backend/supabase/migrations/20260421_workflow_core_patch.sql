-- Koschei AI workflow core patch
-- Adds lightweight workflow fields without changing existing core flow tables.

alter table if exists public.projects
  add column if not exists status text not null default 'draft';

alter table if exists public.project_items
  add column if not exists parent_item_id uuid null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.saved_outputs
  add column if not exists project_id uuid null,
  add column if not exists project_item_id uuid null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_items_parent_item_id_fkey'
  ) then
    alter table public.project_items
      add constraint project_items_parent_item_id_fkey
      foreign key (parent_item_id) references public.project_items(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_outputs_project_id_fkey'
  ) then
    alter table public.saved_outputs
      add constraint saved_outputs_project_id_fkey
      foreign key (project_id) references public.projects(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_outputs_project_item_id_fkey'
  ) then
    alter table public.saved_outputs
      add constraint saved_outputs_project_item_id_fkey
      foreign key (project_item_id) references public.project_items(id)
      on delete set null;
  end if;
end $$;

create index if not exists projects_workspace_user_status_idx
  on public.projects (workspace_id, user_id, status, updated_at desc);

create index if not exists project_items_project_type_created_idx
  on public.project_items (project_id, item_type, created_at desc);

create index if not exists project_items_project_parent_idx
  on public.project_items (project_id, parent_item_id, created_at desc);

create index if not exists saved_outputs_project_created_idx
  on public.saved_outputs (project_id, created_at desc);

create index if not exists saved_outputs_project_item_created_idx
  on public.saved_outputs (project_item_id, created_at desc);
