-- Safe views and RPCs

create or replace view public.workspace_project_summary as
select
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug as workspace_slug,
  count(distinct ugp.id) as total_projects,
  count(distinct ubj.id) filter (where ubj.status in ('queued', 'running')) as active_builds,
  max(ugp.updated_at) as last_project_update_at
from public.workspaces w
left join public.unity_game_projects ugp on ugp.workspace_id = w.id
left join public.unity_build_jobs ubj on ubj.workspace_id = w.id
group by w.id, w.name, w.slug;

create or replace view public.game_factory_project_status as
select
  ugp.id as project_id,
  ugp.workspace_id,
  ugp.title,
  ugp.status as project_status,
  max(ubj.created_at) as last_build_created_at,
  max(grj.created_at) as last_release_created_at,
  count(distinct gb.id) as brief_count,
  count(distinct ubj.id) as build_count,
  count(distinct ga.id) as artifact_count
from public.unity_game_projects ugp
left join public.game_briefs gb on gb.unity_game_project_id = ugp.id
left join public.unity_build_jobs ubj on ubj.unity_game_project_id = ugp.id
left join public.game_artifacts ga on ga.unity_game_project_id = ugp.id
left join public.game_release_jobs grj on grj.unity_game_project_id = ugp.id
group by ugp.id, ugp.workspace_id, ugp.title, ugp.status;

create or replace view public.owner_build_job_overview as
select
  ubj.id,
  ubj.workspace_id,
  ubj.unity_game_project_id,
  ubj.status,
  ubj.started_at,
  ubj.finished_at,
  ubj.error_message,
  ubj.created_at
from public.unity_build_jobs ubj;

create or replace view public.owner_release_job_overview as
select
  grj.id,
  grj.workspace_id,
  grj.unity_game_project_id,
  grj.status,
  grj.provider,
  grj.track,
  grj.started_at,
  grj.finished_at,
  grj.error_message,
  grj.created_at
from public.game_release_jobs grj;

alter view public.workspace_project_summary set (security_invoker = true);
alter view public.game_factory_project_status set (security_invoker = true);
alter view public.owner_build_job_overview set (security_invoker = true);
alter view public.owner_release_job_overview set (security_invoker = true);

create or replace function public.get_my_workspace()
returns setof public.workspaces
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select w.*
  from public.workspaces w
  where public.is_workspace_member(w.id)
  order by w.created_at asc;
$$;

create or replace function public.get_game_project_status(project_id uuid)
returns table (
  project_id uuid,
  workspace_id uuid,
  project_status text,
  latest_build_status text,
  latest_release_status text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    ugp.id,
    ugp.workspace_id,
    ugp.status,
    (
      select ubj.status
      from public.unity_build_jobs ubj
      where ubj.unity_game_project_id = ugp.id
      order by ubj.created_at desc
      limit 1
    ) as latest_build_status,
    (
      select grj.status
      from public.game_release_jobs grj
      where grj.unity_game_project_id = ugp.id
      order by grj.created_at desc
      limit 1
    ) as latest_release_status,
    ugp.updated_at
  from public.unity_game_projects ugp
  where ugp.id = project_id
    and public.is_workspace_member(ugp.workspace_id);
$$;

create or replace function public.record_usage_event(
  p_workspace_id uuid,
  p_event_type text,
  p_quantity numeric,
  p_source text,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.usage_events
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event public.usage_events;
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'not allowed';
  end if;

  if p_idempotency_key is null then
    insert into public.usage_events (workspace_id, user_id, event_type, quantity, source, idempotency_key, metadata)
    values (p_workspace_id, auth.uid(), p_event_type, coalesce(p_quantity, 1), p_source, null, coalesce(p_metadata, '{}'::jsonb))
    returning * into v_event;
  else
    insert into public.usage_events (workspace_id, user_id, event_type, quantity, source, idempotency_key, metadata)
    values (p_workspace_id, auth.uid(), p_event_type, coalesce(p_quantity, 1), p_source, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb))
    on conflict (workspace_id, idempotency_key)
    do update set metadata = public.usage_events.metadata
    returning * into v_event;
  end if;

  return v_event;
end;
$$;

create or replace function public.enqueue_unity_build(project_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_job_id uuid;
begin
  select workspace_id into v_workspace_id
  from public.unity_game_projects
  where id = project_id;

  if v_workspace_id is null or not public.is_workspace_owner(v_workspace_id) then
    raise exception 'not allowed';
  end if;

  insert into public.unity_build_jobs (workspace_id, unity_game_project_id, user_id, status)
  values (v_workspace_id, project_id, auth.uid(), 'queued')
  returning id into v_job_id;

  return v_job_id;
end;
$$;

grant select on public.workspace_project_summary to authenticated;
grant select on public.game_factory_project_status to authenticated;
grant select on public.owner_build_job_overview to authenticated;
grant select on public.owner_release_job_overview to authenticated;
grant execute on function public.get_my_workspace() to authenticated;
grant execute on function public.get_game_project_status(uuid) to authenticated;
grant execute on function public.record_usage_event(uuid, text, numeric, text, text, jsonb) to authenticated;
grant execute on function public.enqueue_unity_build(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
