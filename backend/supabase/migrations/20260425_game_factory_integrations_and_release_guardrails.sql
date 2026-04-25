-- Game Factory user-owned integrations and release guardrails

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text not null,
  encrypted_credentials text not null,
  service_account_email text,
  default_track text not null default 'production',
  status text not null default 'connected',
  last_validated_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_integrations_provider_check check (provider in ('google_play')),
  constraint user_integrations_track_check check (default_track in ('production', 'closed', 'internal'))
);

create index if not exists idx_user_integrations_user_provider on public.user_integrations(user_id, provider);

alter table if exists public.user_integrations enable row level security;

drop policy if exists "users own integrations" on public.user_integrations;
create policy "users own integrations" on public.user_integrations
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists trg_user_integrations_touch_updated_at on public.user_integrations;
create trigger trg_user_integrations_touch_updated_at
before update on public.user_integrations
for each row execute function public.touch_updated_at();

alter table if exists public.game_projects
  add column if not exists google_play_integration_id uuid references public.user_integrations(id) on delete set null;

create index if not exists idx_game_projects_google_play_integration_id on public.game_projects(google_play_integration_id);

alter table if exists public.game_release_jobs
  add column if not exists user_approved_at timestamptz;

create table if not exists public.game_agent_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  game_project_id uuid not null references public.game_projects(id) on delete cascade,
  game_agent_product_id uuid references public.game_agent_products(id) on delete set null,
  status text not null default 'queued',
  prompt text,
  output jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_generation_jobs_status_check check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled'))
);

create index if not exists idx_game_generation_jobs_project on public.game_generation_jobs(game_project_id);

alter table if exists public.game_agent_products enable row level security;
alter table if exists public.game_generation_jobs enable row level security;

drop policy if exists "game agent products read access" on public.game_agent_products;
create policy "game agent products read access" on public.game_agent_products
for select
using (true);

drop trigger if exists trg_game_agent_products_touch_updated_at on public.game_agent_products;
create trigger trg_game_agent_products_touch_updated_at
before update on public.game_agent_products
for each row execute function public.touch_updated_at();

drop policy if exists "users access game generation jobs by ownership" on public.game_generation_jobs;
create policy "users access game generation jobs by ownership" on public.game_generation_jobs
for all
using (public.owns_game_project(game_project_id))
with check (public.owns_game_project(game_project_id));

drop trigger if exists trg_game_generation_jobs_touch_updated_at on public.game_generation_jobs;
create trigger trg_game_generation_jobs_touch_updated_at
before update on public.game_generation_jobs
for each row execute function public.touch_updated_at();

insert into public.game_agent_products (slug, name, description)
values
  ('game_runner_agent', 'Runner Agent', 'Runner türü mobil oyun üretim ajanı.'),
  ('game_puzzle_agent', 'Puzzle Agent', 'Puzzle türü mobil oyun üretim ajanı.'),
  ('game_arcade_agent', 'Arcade Agent', 'Arcade türü mobil oyun üretim ajanı.'),
  ('game_platformer_agent', 'Platformer Agent', 'Platformer türü mobil oyun üretim ajanı.'),
  ('game_idle_clicker_agent', 'Idle Clicker Agent', 'Idle clicker türü mobil oyun üretim ajanı.'),
  ('game_custom_agent', 'Custom Agent', 'Özel kurgu mobil oyun üretim ajanı.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();
