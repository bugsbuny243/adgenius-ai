-- Workflow core patch (idempotent)

alter table if exists public.projects
  add column if not exists status text not null default 'draft';

alter table if exists public.project_items
  add column if not exists parent_item_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.saved_outputs
  add column if not exists project_id uuid,
  add column if not exists project_item_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.project_items
  drop constraint if exists project_items_parent_item_id_fkey,
  add constraint project_items_parent_item_id_fkey
    foreign key (parent_item_id)
    references public.project_items(id)
    on delete set null;

alter table if exists public.saved_outputs
  drop constraint if exists saved_outputs_project_id_fkey,
  add constraint saved_outputs_project_id_fkey
    foreign key (project_id)
    references public.projects(id)
    on delete set null,
  drop constraint if exists saved_outputs_project_item_id_fkey,
  add constraint saved_outputs_project_item_id_fkey
    foreign key (project_item_id)
    references public.project_items(id)
    on delete set null;

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_items_parent_item_id on public.project_items(parent_item_id);
create index if not exists idx_saved_outputs_project_id on public.saved_outputs(project_id);
create index if not exists idx_saved_outputs_project_item_id on public.saved_outputs(project_item_id);
