-- RLS hardening for workspace-scoped tables (idempotent)

create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
  );
$$;

-- Workspace tables used by dashboard/flows.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['content_items', 'publish_jobs', 'usage_metering']
  loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('alter table public.%I enable row level security', tbl);

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = format('workspace member access %s', tbl)
      ) then
        execute format(
          'create policy %I on public.%I for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))',
          format('workspace member access %s', tbl),
          tbl
        );
      end if;
    end if;
  end loop;
end $$;

-- Some environments use workspace_users instead of workspace_members.
do $$
begin
  if to_regclass('public.workspace_users') is not null then
    alter table public.workspace_users enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'workspace_users'
        and policyname = 'workspace member read workspace_users'
    ) then
      create policy "workspace member read workspace_users"
      on public.workspace_users
      for select
      using (public.is_workspace_member(workspace_id));
    end if;
  end if;
end $$;
