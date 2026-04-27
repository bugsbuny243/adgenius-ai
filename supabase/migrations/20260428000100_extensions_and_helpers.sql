-- Extensions and helper functions
create extension if not exists pgcrypto;

-- Common trigger function to keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Returns the current authenticated user ID from JWT claims.
create or replace function public.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select nullif(auth.uid()::text, '')::uuid;
$$;

-- Workspace membership helper used by RLS.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

-- Workspace owner/admin helper used by RLS.
create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_user_id = auth.uid()
  );
$$;

-- Optional request context setter for backend-only use.
create or replace function public.set_request_context(p_workspace_id uuid, p_request_id text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.workspace_id', coalesce(p_workspace_id::text, ''), true);
  perform set_config('request.id', coalesce(p_request_id, ''), true);
end;
$$;

grant execute on function public.current_user_id() to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
revoke execute on function public.set_request_context(uuid, text) from anon, authenticated;

select pg_notify('pgrst', 'reload schema');
