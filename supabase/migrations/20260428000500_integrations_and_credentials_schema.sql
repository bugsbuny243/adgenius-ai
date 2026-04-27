-- Integrations and credential storage

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text,
  status text not null default 'active',
  service_account_email text,
  default_track text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_integration_id uuid not null references public.user_integrations(id) on delete cascade,
  provider text,
  credential_type text,
  encrypted_payload text,
  vault_secret_id uuid,
  key_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_integrations_workspace_id on public.user_integrations (workspace_id);
create index if not exists idx_user_integrations_provider_status on public.user_integrations (provider, status);
create index if not exists idx_user_integrations_user_id on public.user_integrations (user_id);
create index if not exists idx_integration_credentials_workspace_id on public.integration_credentials (workspace_id);
create index if not exists idx_integration_credentials_integration_id on public.integration_credentials (user_integration_id);

drop trigger if exists trg_user_integrations_updated_at on public.user_integrations;
create trigger trg_user_integrations_updated_at before update on public.user_integrations for each row execute function public.touch_updated_at();
drop trigger if exists trg_integration_credentials_updated_at on public.integration_credentials;
create trigger trg_integration_credentials_updated_at before update on public.integration_credentials for each row execute function public.touch_updated_at();

comment on table public.integration_credentials is 'Never store plaintext secrets. Store encrypted_payload (app-level encryption) or vault_secret_id (Supabase Vault).';

select pg_notify('pgrst', 'reload schema');
