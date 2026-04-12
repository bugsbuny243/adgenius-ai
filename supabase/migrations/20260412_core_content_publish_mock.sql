create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid null,
  user_id uuid not null,
  brief text not null,
  platforms text[] not null default '{}',
  youtube_title text null,
  youtube_description text null,
  instagram_caption text null,
  tiktok_caption text null,
  run_id uuid null,
  saved_output_id uuid null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid null,
  content_output_id uuid null,
  target_platform text not null,
  status text not null default 'draft',
  queued_at timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_items_workspace_id_created_at_idx
  on public.content_items (workspace_id, created_at desc);

create index if not exists publish_jobs_workspace_id_created_at_idx
  on public.publish_jobs (workspace_id, created_at desc);
