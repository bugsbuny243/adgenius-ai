-- Enable RLS and apply policies

-- Tables that should enforce workspace/auth boundaries.
alter table if exists public.profiles enable row level security;
alter table if exists public.workspaces enable row level security;
alter table if exists public.workspace_members enable row level security;
alter table if exists public.workspace_invitations enable row level security;
alter table if exists public.plans enable row level security;
alter table if exists public.subscriptions enable row level security;
alter table if exists public.usage_counters enable row level security;
alter table if exists public.usage_events enable row level security;
alter table if exists public.payment_orders enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.billing_events enable row level security;
alter table if exists public.unity_game_projects enable row level security;
alter table if exists public.game_briefs enable row level security;
alter table if exists public.game_generation_jobs enable row level security;
alter table if exists public.unity_build_jobs enable row level security;
alter table if exists public.game_artifacts enable row level security;
alter table if exists public.game_release_jobs enable row level security;
alter table if exists public.game_release_events enable row level security;
alter table if exists public.game_build_jobs enable row level security;
alter table if exists public.user_integrations enable row level security;
alter table if exists public.integration_credentials enable row level security;
alter table if exists public.background_jobs enable row level security;
alter table if exists public.job_attempts enable row level security;
alter table if exists public.webhook_events enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.security_events enable row level security;
alter table if exists public.api_usage_counters enable row level security;
alter table if exists public.rate_limit_events enable row level security;
alter table if exists public.idempotency_keys enable row level security;

-- Profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_select_workspace_members on public.profiles;
create policy profiles_select_workspace_members on public.profiles
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid()
      and a.status = 'active'
      and b.user_id = profiles.id
      and b.status = 'active'
  )
);

-- Workspaces and members
drop policy if exists workspaces_member_read on public.workspaces;
create policy workspaces_member_read on public.workspaces for select to authenticated using (public.is_workspace_member(id));
drop policy if exists workspaces_owner_admin_update on public.workspaces;
create policy workspaces_owner_admin_update on public.workspaces for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
drop policy if exists workspaces_owner_insert on public.workspaces;
create policy workspaces_owner_insert on public.workspaces for insert to authenticated with check (owner_user_id = auth.uid());

drop policy if exists workspace_members_read on public.workspace_members;
create policy workspace_members_read on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_members_manage on public.workspace_members;
create policy workspace_members_manage on public.workspace_members for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

drop policy if exists workspace_invitations_read on public.workspace_invitations;
create policy workspace_invitations_read on public.workspace_invitations for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_invitations_manage on public.workspace_invitations;
create policy workspace_invitations_manage on public.workspace_invitations for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- Workspace-scoped game factory (members can read, owner/admin can write)
drop policy if exists ugp_read on public.unity_game_projects;
create policy ugp_read on public.unity_game_projects for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists ugp_write on public.unity_game_projects;
create policy ugp_write on public.unity_game_projects for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_briefs_read on public.game_briefs;
create policy game_briefs_read on public.game_briefs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_briefs_write on public.game_briefs;
create policy game_briefs_write on public.game_briefs for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_generation_jobs_read on public.game_generation_jobs;
create policy game_generation_jobs_read on public.game_generation_jobs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_generation_jobs_write on public.game_generation_jobs;
create policy game_generation_jobs_write on public.game_generation_jobs for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists unity_build_jobs_read on public.unity_build_jobs;
create policy unity_build_jobs_read on public.unity_build_jobs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists unity_build_jobs_write on public.unity_build_jobs;
create policy unity_build_jobs_write on public.unity_build_jobs for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_artifacts_read on public.game_artifacts;
create policy game_artifacts_read on public.game_artifacts for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_artifacts_write on public.game_artifacts;
create policy game_artifacts_write on public.game_artifacts for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_release_jobs_read on public.game_release_jobs;
create policy game_release_jobs_read on public.game_release_jobs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_release_jobs_write on public.game_release_jobs;
create policy game_release_jobs_write on public.game_release_jobs for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_release_events_read on public.game_release_events;
create policy game_release_events_read on public.game_release_events for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_release_events_write on public.game_release_events;
create policy game_release_events_write on public.game_release_events for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists game_build_jobs_read on public.game_build_jobs;
create policy game_build_jobs_read on public.game_build_jobs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists game_build_jobs_write on public.game_build_jobs;
create policy game_build_jobs_write on public.game_build_jobs for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- Billing and usage restricted to owner/admin
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to authenticated using (true);
drop policy if exists subscriptions_owner_admin on public.subscriptions;
create policy subscriptions_owner_admin on public.subscriptions for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists usage_counters_owner_admin on public.usage_counters;
create policy usage_counters_owner_admin on public.usage_counters for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists usage_events_owner_admin on public.usage_events;
create policy usage_events_owner_admin on public.usage_events for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists payment_orders_owner_admin on public.payment_orders;
create policy payment_orders_owner_admin on public.payment_orders for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists payments_owner_admin on public.payments;
create policy payments_owner_admin on public.payments for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists transactions_owner_admin on public.transactions;
create policy transactions_owner_admin on public.transactions for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists billing_events_owner_admin on public.billing_events;
create policy billing_events_owner_admin on public.billing_events for select to authenticated using (public.is_workspace_owner(workspace_id));

-- Integrations and credentials
drop policy if exists user_integrations_owner_admin on public.user_integrations;
create policy user_integrations_owner_admin on public.user_integrations for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
drop policy if exists integration_credentials_backend_only on public.integration_credentials;
create policy integration_credentials_backend_only on public.integration_credentials for all to service_role using (true) with check (true);

-- Backend/service-role only tables
drop policy if exists background_jobs_service_role on public.background_jobs;
create policy background_jobs_service_role on public.background_jobs for all to service_role using (true) with check (true);
drop policy if exists job_attempts_service_role on public.job_attempts;
create policy job_attempts_service_role on public.job_attempts for all to service_role using (true) with check (true);
drop policy if exists webhook_events_service_role on public.webhook_events;
create policy webhook_events_service_role on public.webhook_events for all to service_role using (true) with check (true);
drop policy if exists api_usage_counters_service_role on public.api_usage_counters;
create policy api_usage_counters_service_role on public.api_usage_counters for all to service_role using (true) with check (true);
drop policy if exists rate_limit_events_service_role on public.rate_limit_events;
create policy rate_limit_events_service_role on public.rate_limit_events for all to service_role using (true) with check (true);
drop policy if exists idempotency_keys_service_role on public.idempotency_keys;
create policy idempotency_keys_service_role on public.idempotency_keys for all to service_role using (true) with check (true);

-- Audit/security logs owner-admin read; backend insert
drop policy if exists audit_logs_owner_admin_read on public.audit_logs;
create policy audit_logs_owner_admin_read on public.audit_logs for select to authenticated using (public.is_workspace_owner(workspace_id));
drop policy if exists audit_logs_service_insert on public.audit_logs;
create policy audit_logs_service_insert on public.audit_logs for insert to service_role with check (true);
drop policy if exists security_events_owner_admin_read on public.security_events;
create policy security_events_owner_admin_read on public.security_events for select to authenticated using (public.is_workspace_owner(workspace_id));
drop policy if exists security_events_service_insert on public.security_events;
create policy security_events_service_insert on public.security_events for insert to service_role with check (true);

select pg_notify('pgrst', 'reload schema');
