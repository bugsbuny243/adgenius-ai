-- Koschei x Gemini x Supabase schema
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id bigint generated always as identity primary key,
  project_id text not null,
  agent_name text not null,
  status text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  revenue numeric(12,4) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_agent_runs_project_time on public.agent_runs(project_id, created_at desc);
create index if not exists idx_agent_runs_status on public.agent_runs(status);
create index if not exists idx_ad_events_project_time on public.ad_events(project_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.ad_events enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "projects_owner_all"
on public.projects
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "ad_events_owner_read"
on public.ad_events
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = ad_events.project_id and p.owner_id = auth.uid()
  )
);
