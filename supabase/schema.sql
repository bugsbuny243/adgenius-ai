create extension if not exists "pgcrypto";

create table if not exists public.workspace_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'operator',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.workspace_users(id),
  name text not null,
  prompt text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  agent_name text not null,
  status text not null,
  input jsonb not null,
  output jsonb,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_metering (
  day date not null,
  project_id uuid not null references public.projects(id),
  request_count bigint not null default 0,
  active_users bigint not null default 0,
  primary key (day, project_id)
);
