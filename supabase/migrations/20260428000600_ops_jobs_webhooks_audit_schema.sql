-- Ops, jobs, webhooks, and audit schema

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  job_type text not null,
  status text not null default 'queued',
  priority integer not null default 100,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_attempts (
  id uuid primary key default gen_random_uuid(),
  background_job_id uuid not null references public.background_jobs(id) on delete cascade,
  attempt_number integer not null,
  status text not null default 'started',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(background_job_id, attempt_number)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  provider text not null,
  event_id text,
  signature_valid boolean not null default false,
  status text not null default 'received',
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_webhook_events_provider_event_unique
  on public.webhook_events (provider, event_id)
  where event_id is not null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  route_key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  request_count bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, user_id, route_key, period_start)
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  route_key text,
  limit_key text,
  blocked boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  request_hash text,
  response_payload jsonb,
  status_code integer,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, idempotency_key)
);

create index if not exists idx_background_jobs_workspace_id on public.background_jobs (workspace_id);
create index if not exists idx_background_jobs_status_priority on public.background_jobs (status, priority, run_after);
create index if not exists idx_background_jobs_created_at_desc on public.background_jobs (created_at desc);
create index if not exists idx_job_attempts_background_job_id on public.job_attempts (background_job_id);
create index if not exists idx_webhook_events_provider_status on public.webhook_events (provider, status);
create index if not exists idx_webhook_events_created_at_desc on public.webhook_events (created_at desc);
create index if not exists idx_audit_logs_workspace_created_at on public.audit_logs (workspace_id, created_at desc);
create index if not exists idx_security_events_workspace_created_at on public.security_events (workspace_id, created_at desc);
create index if not exists idx_api_usage_counters_workspace_user on public.api_usage_counters (workspace_id, user_id);
create index if not exists idx_rate_limit_events_workspace_created_at on public.rate_limit_events (workspace_id, created_at desc);
create index if not exists idx_idempotency_keys_workspace_key on public.idempotency_keys (workspace_id, idempotency_key);

drop trigger if exists trg_background_jobs_updated_at on public.background_jobs;
create trigger trg_background_jobs_updated_at before update on public.background_jobs for each row execute function public.touch_updated_at();
drop trigger if exists trg_api_usage_counters_updated_at on public.api_usage_counters;
create trigger trg_api_usage_counters_updated_at before update on public.api_usage_counters for each row execute function public.touch_updated_at();

select pg_notify('pgrst', 'reload schema');
