alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.workspace_members
  add constraint workspace_members_role_check check (role in ('owner', 'admin', 'member'));

create or replace function public.is_workspace_admin_or_owner(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('run', 'saved_output', 'note')),
  title text,
  content text,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_item_comments (
  id uuid primary key default gen_random_uuid(),
  project_item_id uuid not null references public.project_items(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('run_created', 'output_saved', 'output_deleted', 'project_created', 'project_item_added', 'subscription_changed', 'comment_added', 'share_link_created')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_type text not null check (resource_type in ('project', 'saved_output')),
  resource_id uuid not null,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_invitations_workspace on public.workspace_invitations(workspace_id, created_at desc);
create index if not exists idx_projects_workspace on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_project on public.project_items(project_id, created_at desc);
create index if not exists idx_project_item_comments_item on public.project_item_comments(project_item_id, created_at asc);
create index if not exists idx_activity_logs_workspace on public.activity_logs(workspace_id, created_at desc);
create index if not exists idx_activity_logs_project on public.activity_logs(project_id, created_at desc);
create index if not exists idx_share_links_resource on public.share_links(workspace_id, resource_type, resource_id);

alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.project_item_comments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.share_links enable row level security;

create trigger set_workspace_invitations_updated_at
before update on public.workspace_invitations
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_project_items_updated_at
before update on public.project_items
for each row execute function public.set_updated_at();

create trigger set_project_item_comments_updated_at
before update on public.project_item_comments
for each row execute function public.set_updated_at();

drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert to authenticated
with check (
  (user_id = auth.uid() and role = 'owner')
  or public.is_workspace_admin_or_owner(workspace_id)
);

create policy workspace_members_update_admin on public.workspace_members
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));

create policy workspace_members_delete_admin on public.workspace_members
for delete to authenticated
using (public.is_workspace_admin_or_owner(workspace_id));

create policy workspace_invitations_select_member on public.workspace_invitations
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy workspace_invitations_insert_admin on public.workspace_invitations
for insert to authenticated
with check (invited_by = auth.uid() and public.is_workspace_admin_or_owner(workspace_id));

create policy workspace_invitations_update_admin on public.workspace_invitations
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));

create policy projects_select_member on public.projects
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy projects_insert_member on public.projects
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy projects_update_editor on public.projects
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid());

create policy projects_delete_editor on public.projects
for delete to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid());

create policy project_items_select_member on public.project_items
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy project_items_insert_member on public.project_items
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy project_items_update_editor on public.project_items
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid());

create policy project_items_delete_editor on public.project_items
for delete to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid());

create policy project_item_comments_select_member on public.project_item_comments
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy project_item_comments_insert_member on public.project_item_comments
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and author_id = auth.uid());

create policy project_item_comments_update_editor on public.project_item_comments
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or author_id = auth.uid())
with check (public.is_workspace_admin_or_owner(workspace_id) or author_id = auth.uid());

create policy project_item_comments_delete_editor on public.project_item_comments
for delete to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or author_id = auth.uid());

create policy activity_logs_select_member on public.activity_logs
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy activity_logs_insert_member on public.activity_logs
for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (actor_user_id is null or actor_user_id = auth.uid())
);

create policy share_links_select_member on public.share_links
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy share_links_insert_member on public.share_links
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy share_links_update_editor on public.share_links
for update to authenticated
using (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin_or_owner(workspace_id) or created_by = auth.uid());

create or replace function public.get_shared_project(p_token text)
returns table (
  project_id uuid,
  workspace_id uuid,
  name text,
  description text,
  created_at timestamptz,
  item_count bigint
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.workspace_id, p.name, p.description, p.created_at,
    (select count(*) from public.project_items pi where pi.project_id = p.id) as item_count
  from public.share_links sl
  join public.projects p on p.id = sl.resource_id and sl.resource_type = 'project'
  where sl.token = p_token
    and sl.revoked_at is null
    and (sl.expires_at is null or sl.expires_at > now())
  limit 1;
$$;

create or replace function public.get_shared_project_items(p_token text)
returns table (
  item_id uuid,
  item_type text,
  title text,
  content text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pi.id, pi.item_type, pi.title, pi.content, pi.created_at
  from public.share_links sl
  join public.projects p on p.id = sl.resource_id and sl.resource_type = 'project'
  join public.project_items pi on pi.project_id = p.id
  where sl.token = p_token
    and sl.revoked_at is null
    and (sl.expires_at is null or sl.expires_at > now())
  order by pi.created_at asc;
$$;

create or replace function public.get_shared_saved_output(p_token text)
returns table (
  output_id uuid,
  title text,
  content text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select so.id, so.title, so.content, so.created_at
  from public.share_links sl
  join public.saved_outputs so on so.id = sl.resource_id and sl.resource_type = 'saved_output'
  where sl.token = p_token
    and sl.revoked_at is null
    and (sl.expires_at is null or sl.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_shared_project(text) to anon, authenticated;
grant execute on function public.get_shared_project_items(text) to anon, authenticated;
grant execute on function public.get_shared_saved_output(text) to anon, authenticated;
