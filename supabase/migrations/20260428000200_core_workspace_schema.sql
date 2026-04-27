-- Core workspace and identity schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  default_workspace_id uuid,
  role text not null default 'user',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists default_workspace_id uuid;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique,
  type text not null default 'personal',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.workspaces add column if not exists name text;
alter table public.workspaces add column if not exists slug text;
alter table public.workspaces add column if not exists type text not null default 'personal';
alter table public.workspaces add column if not exists status text not null default 'active';
alter table public.workspaces add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.workspaces add column if not exists created_at timestamptz not null default now();
alter table public.workspaces add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_workspaces_slug_unique on public.workspaces (slug) where slug is not null;
create index if not exists idx_workspaces_owner_user_id on public.workspaces (owner_user_id);
create index if not exists idx_workspaces_created_at_desc on public.workspaces (created_at desc);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

alter table public.workspace_members add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.workspace_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.workspace_members add column if not exists role text not null default 'member';
alter table public.workspace_members add column if not exists status text not null default 'active';
alter table public.workspace_members add column if not exists created_at timestamptz not null default now();
alter table public.workspace_members add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_workspace_members_workspace_user_unique on public.workspace_members (workspace_id, user_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members (user_id);
create index if not exists idx_workspace_members_workspace_id on public.workspace_members (workspace_id);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  role text not null default 'member',
  status text not null default 'pending',
  token_hash text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workspace_invitations add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.workspace_invitations add column if not exists invited_email text;
alter table public.workspace_invitations add column if not exists invited_by uuid references auth.users(id) on delete set null;
alter table public.workspace_invitations add column if not exists role text not null default 'member';
alter table public.workspace_invitations add column if not exists status text not null default 'pending';
alter table public.workspace_invitations add column if not exists token_hash text;
alter table public.workspace_invitations add column if not exists expires_at timestamptz;
alter table public.workspace_invitations add column if not exists accepted_at timestamptz;
alter table public.workspace_invitations add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_default_workspace_fk'
  ) then
    alter table public.profiles
      add constraint profiles_default_workspace_fk
      foreign key (default_workspace_id) references public.workspaces(id) on delete set null;
  end if;
end $$;

create index if not exists idx_workspace_invitations_workspace_id on public.workspace_invitations (workspace_id);
create index if not exists idx_workspace_invitations_invited_email on public.workspace_invitations (lower(invited_email));
create index if not exists idx_workspace_invitations_status on public.workspace_invitations (status);

-- updated_at triggers
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function public.touch_updated_at();
drop trigger if exists trg_workspace_members_updated_at on public.workspace_members;
create trigger trg_workspace_members_updated_at before update on public.workspace_members for each row execute function public.touch_updated_at();

select pg_notify('pgrst', 'reload schema');
