-- Drop old permissive policies and create safer replacements

drop policy if exists "user_integrations.users own integrations" on public.user_integrations;
drop policy if exists "unity_build_jobs.workspace member access unity build jobs" on public.unity_build_jobs;
drop policy if exists "unity_game_projects.workspace member access unity game projects" on public.unity_game_projects;
drop policy if exists "usage_counters.usage_counters_update_member" on public.usage_counters;
drop policy if exists "usage_counters.usage_counters_insert_member" on public.usage_counters;
drop policy if exists "game_artifacts.users access game artifacts by ownership" on public.game_artifacts;
drop policy if exists "game_build_jobs.users access game builds by ownership" on public.game_build_jobs;
drop policy if exists "game_release_jobs.users access game releases by ownership" on public.game_release_jobs;
drop policy if exists "game_briefs.users access game briefs by ownership" on public.game_briefs;
drop policy if exists "game_generation_jobs.users access game generation jobs by owner" on public.game_generation_jobs;

alter table if exists public.user_integrations enable row level security;
alter table if exists public.integration_credentials enable row level security;
alter table if exists public.unity_game_projects enable row level security;
alter table if exists public.unity_build_jobs enable row level security;
alter table if exists public.game_artifacts enable row level security;
alter table if exists public.game_release_jobs enable row level security;
alter table if exists public.usage_counters enable row level security;
alter table if exists public.usage_events enable row level security;
alter table if exists public.webhook_events enable row level security;
alter table if exists public.background_jobs enable row level security;
alter table if exists public.security_events enable row level security;

create policy if not exists "workspace members can read unity game projects"
on public.unity_game_projects for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid()));

create policy if not exists "workspace members can read unity build jobs"
on public.unity_build_jobs for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid()));

create policy if not exists "workspace members can read game artifacts"
on public.game_artifacts for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid()));

create policy if not exists "workspace members can read release jobs"
on public.game_release_jobs for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid()));

create policy if not exists "workspace owner admin mutates integrations"
on public.user_integrations for all
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin')))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin')));

create policy if not exists "integration credentials service role only"
on public.integration_credentials for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists "webhook events service role only"
on public.webhook_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists "background jobs service role only"
on public.background_jobs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists "security events service role only"
on public.security_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists "usage events service role only"
on public.usage_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy if not exists "usage counters select workspace member"
on public.usage_counters for select
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid()));

create policy if not exists "usage counters writes service role only"
on public.usage_counters for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

grant select on public.user_integrations_public to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
