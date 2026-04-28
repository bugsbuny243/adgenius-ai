create table if not exists public.google_play_readiness (
  project_id uuid primary key references public.unity_game_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_mode text not null check (delivery_mode in ('apk_aab_only', 'play_publish', 'setup_assisted')),
  google_play_account_status text not null check (google_play_account_status in ('unknown', 'user_has_account', 'user_needs_setup', 'artifact_only')),
  confirmed_requirements jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_play_readiness_user_id on public.google_play_readiness(user_id);

alter table if exists public.google_play_readiness enable row level security;

create policy if not exists "users own google play readiness rows"
on public.google_play_readiness for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
