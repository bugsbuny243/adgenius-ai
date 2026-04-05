alter table public.agent_runs
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
