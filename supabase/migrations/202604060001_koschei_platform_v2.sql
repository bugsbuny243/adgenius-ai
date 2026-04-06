-- Koschei AI v2.0 platform foundations

alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;

alter table public.workspace_members
  add constraint workspace_members_role_check check (role in ('owner', 'admin', 'member'));

create or replace function public.is_workspace_admin(p_workspace_id uuid)
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
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invite_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_workspace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_item_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_item_id uuid not null references public.project_items(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  project_item_id uuid references public.project_items(id) on delete set null,
  event_type text not null check (event_type in ('run_created', 'output_saved', 'output_deleted', 'project_created', 'project_item_added', 'subscription_changed')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_type text not null check (resource_type in ('project', 'saved_output')),
  resource_id uuid not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_invitations_workspace on public.workspace_invitations(workspace_id, created_at desc);
create index if not exists idx_workspace_invitations_email on public.workspace_invitations(email, status);
create index if not exists idx_projects_workspace_created on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_project_position on public.project_items(project_id, position, created_at);
create index if not exists idx_project_items_workspace on public.project_items(workspace_id, created_at desc);
create index if not exists idx_project_item_comments_item_created on public.project_item_comments(project_item_id, created_at desc);
create index if not exists idx_activity_logs_workspace_created on public.activity_logs(workspace_id, created_at desc);
create index if not exists idx_activity_logs_project_created on public.activity_logs(project_id, created_at desc);
create index if not exists idx_share_tokens_token on public.share_tokens(token);

alter table public.workspace_invitations enable row level security;
alter table public.user_workspace_preferences enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.project_item_comments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.share_tokens enable row level security;

drop trigger if exists set_workspace_invitations_updated_at on public.workspace_invitations;
create trigger set_workspace_invitations_updated_at
before update on public.workspace_invitations
for each row execute function public.set_updated_at();

drop trigger if exists set_user_workspace_preferences_updated_at on public.user_workspace_preferences;
create trigger set_user_workspace_preferences_updated_at
before update on public.user_workspace_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_project_items_updated_at on public.project_items;
create trigger set_project_items_updated_at
before update on public.project_items
for each row execute function public.set_updated_at();

drop trigger if exists set_project_item_comments_updated_at on public.project_item_comments;
create trigger set_project_item_comments_updated_at
before update on public.project_item_comments
for each row execute function public.set_updated_at();

create or replace function public.log_workspace_activity(
  p_workspace_id uuid,
  p_event_type text,
  p_project_id uuid default null,
  p_project_item_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (workspace_id, actor_user_id, project_id, project_item_id, event_type, metadata)
  values (p_workspace_id, auth.uid(), p_project_id, p_project_item_id, p_event_type, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

grant execute on function public.log_workspace_activity(uuid, text, uuid, uuid, jsonb) to authenticated;

create or replace function public.track_run_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_workspace_activity(new.workspace_id, 'run_created', null, null, jsonb_build_object('run_id', new.id, 'status', new.status));
  return new;
end;
$$;

create or replace function public.track_output_saved()
returns trigger
language plpgsql
as $$
begin
  perform public.log_workspace_activity(new.workspace_id, 'output_saved', null, null, jsonb_build_object('saved_output_id', new.id, 'title', new.title));
  return new;
end;
$$;

create or replace function public.track_output_deleted()
returns trigger
language plpgsql
as $$
begin
  perform public.log_workspace_activity(old.workspace_id, 'output_deleted', null, null, jsonb_build_object('saved_output_id', old.id, 'title', old.title));
  return old;
end;
$$;

create or replace function public.track_project_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_workspace_activity(new.workspace_id, 'project_created', new.id, null, jsonb_build_object('project_name', new.name));
  return new;
end;
$$;

create or replace function public.track_project_item_added()
returns trigger
language plpgsql
as $$
begin
  perform public.log_workspace_activity(new.workspace_id, 'project_item_added', new.project_id, new.id, jsonb_build_object('item_title', new.title));
  return new;
end;
$$;

create or replace function public.track_subscription_changed()
returns trigger
language plpgsql
as $$
begin
  if old.plan_name is distinct from new.plan_name or old.status is distinct from new.status then
    perform public.log_workspace_activity(new.workspace_id, 'subscription_changed', null, null, jsonb_build_object('old_plan', old.plan_name, 'new_plan', new.plan_name, 'old_status', old.status, 'new_status', new.status));
  end if;

  return new;
end;
$$;

drop trigger if exists tr_agent_runs_activity_created on public.agent_runs;
create trigger tr_agent_runs_activity_created
after insert on public.agent_runs
for each row execute function public.track_run_created();

drop trigger if exists tr_saved_outputs_activity_saved on public.saved_outputs;
create trigger tr_saved_outputs_activity_saved
after insert on public.saved_outputs
for each row execute function public.track_output_saved();

drop trigger if exists tr_saved_outputs_activity_deleted on public.saved_outputs;
create trigger tr_saved_outputs_activity_deleted
after delete on public.saved_outputs
for each row execute function public.track_output_deleted();

drop trigger if exists tr_projects_activity_created on public.projects;
create trigger tr_projects_activity_created
after insert on public.projects
for each row execute function public.track_project_created();

drop trigger if exists tr_project_items_activity_added on public.project_items;
create trigger tr_project_items_activity_added
after insert on public.project_items
for each row execute function public.track_project_item_added();

drop trigger if exists tr_subscriptions_activity_changed on public.subscriptions;
create trigger tr_subscriptions_activity_changed
after update on public.subscriptions
for each row execute function public.track_subscription_changed();

drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
for insert to authenticated
with check (public.is_workspace_admin(workspace_id) or (user_id = auth.uid() and role = 'owner'));

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin on public.workspace_members
for update to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists workspace_invitations_read_member on public.workspace_invitations;
create policy workspace_invitations_read_member on public.workspace_invitations
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_invitations_insert_admin on public.workspace_invitations;
create policy workspace_invitations_insert_admin on public.workspace_invitations
for insert to authenticated
with check (public.is_workspace_admin(workspace_id) and invited_by = auth.uid());

drop policy if exists workspace_invitations_update_admin on public.workspace_invitations;
create policy workspace_invitations_update_admin on public.workspace_invitations
for update to authenticated
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists user_workspace_preferences_select_own on public.user_workspace_preferences;
create policy user_workspace_preferences_select_own on public.user_workspace_preferences
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_workspace_preferences_upsert_own on public.user_workspace_preferences;
create policy user_workspace_preferences_upsert_own on public.user_workspace_preferences
for insert to authenticated
with check (user_id = auth.uid() and (current_workspace_id is null or public.is_workspace_member(current_workspace_id)));

drop policy if exists user_workspace_preferences_update_own on public.user_workspace_preferences;
create policy user_workspace_preferences_update_own on public.user_workspace_preferences
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and (current_workspace_id is null or public.is_workspace_member(current_workspace_id)));

drop policy if exists projects_read_member on public.projects;
create policy projects_read_member on public.projects
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists projects_insert_member on public.projects;
create policy projects_insert_member on public.projects
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists projects_update_admin_or_creator on public.projects;
create policy projects_update_admin_or_creator on public.projects
for update to authenticated
using (public.is_workspace_admin(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

drop policy if exists projects_delete_admin_or_creator on public.projects;
create policy projects_delete_admin_or_creator on public.projects
for delete to authenticated
using (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

drop policy if exists project_items_read_member on public.project_items;
create policy project_items_read_member on public.project_items
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists project_items_insert_member on public.project_items;
create policy project_items_insert_member on public.project_items
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists project_items_update_admin_or_creator on public.project_items;
create policy project_items_update_admin_or_creator on public.project_items
for update to authenticated
using (public.is_workspace_admin(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

drop policy if exists project_items_delete_admin_or_creator on public.project_items;
create policy project_items_delete_admin_or_creator on public.project_items
for delete to authenticated
using (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

drop policy if exists project_item_comments_read_member on public.project_item_comments;
create policy project_item_comments_read_member on public.project_item_comments
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists project_item_comments_insert_member on public.project_item_comments;
create policy project_item_comments_insert_member on public.project_item_comments
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and author_id = auth.uid());

drop policy if exists project_item_comments_update_admin_or_author on public.project_item_comments;
create policy project_item_comments_update_admin_or_author on public.project_item_comments
for update to authenticated
using (public.is_workspace_admin(workspace_id) or author_id = auth.uid())
with check (public.is_workspace_admin(workspace_id) or author_id = auth.uid());

drop policy if exists activity_logs_read_member on public.activity_logs;
create policy activity_logs_read_member on public.activity_logs
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists activity_logs_insert_member on public.activity_logs;
create policy activity_logs_insert_member on public.activity_logs
for insert to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists share_tokens_read_member on public.share_tokens;
create policy share_tokens_read_member on public.share_tokens
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists share_tokens_insert_member on public.share_tokens;
create policy share_tokens_insert_member on public.share_tokens
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists share_tokens_update_admin_or_creator on public.share_tokens;
create policy share_tokens_update_admin_or_creator on public.share_tokens
for update to authenticated
using (public.is_workspace_admin(workspace_id) or created_by = auth.uid())
with check (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

create or replace function public.get_shared_project(p_token text)
returns table (
  project_id uuid,
  project_name text,
  project_description text,
  workspace_id uuid,
  created_at timestamptz,
  items jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.description,
    p.workspace_id,
    p.created_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'title', pi.title,
          'content', pi.content,
          'position', pi.position,
          'created_at', pi.created_at
        )
        order by pi.position asc, pi.created_at asc
      ) filter (where pi.id is not null),
      '[]'::jsonb
    ) as items
  from public.share_tokens st
  join public.projects p on p.id = st.resource_id and st.resource_type = 'project'
  left join public.project_items pi on pi.project_id = p.id
  where st.token = p_token
    and st.revoked_at is null
    and (st.expires_at is null or st.expires_at > now())
  group by p.id, p.name, p.description, p.workspace_id, p.created_at;
$$;

grant execute on function public.get_shared_project(text) to anon, authenticated;

create or replace function public.get_shared_saved_output(p_token text)
returns table (
  saved_output_id uuid,
  title text,
  content text,
  created_at timestamptz,
  workspace_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    so.id,
    so.title,
    so.content,
    so.created_at,
    so.workspace_id
  from public.share_tokens st
  join public.saved_outputs so on so.id = st.resource_id and st.resource_type = 'saved_output'
  where st.token = p_token
    and st.revoked_at is null
    and (st.expires_at is null or st.expires_at > now());
$$;

grant execute on function public.get_shared_saved_output(text) to anon, authenticated;
