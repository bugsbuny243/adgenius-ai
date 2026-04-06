create table if not exists public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  handle varchar(40) not null unique,
  bio text,
  avatar_url text,
  website text,
  public_profile_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_handle_format check (handle ~ '^[a-z0-9_]{3,40}$')
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text not null,
  category text not null,
  sample_output text not null,
  tags text[] not null default '{}',
  cover_url text,
  config jsonb,
  is_public boolean not null default false,
  published_at timestamptz,
  views_count integer not null default 0,
  clone_count integer not null default 0,
  run_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_template_id uuid references public.templates(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  sample_output text,
  tags text[] not null default '{}',
  config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_clones (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  workspace_template_id uuid not null references public.workspace_templates(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, workspace_id)
);

create table if not exists public.template_likes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, user_id)
);

create or replace function public.enforce_template_quality_guardrails()
returns trigger
language plpgsql
as $$
begin
  if new.is_public then
    if coalesce(length(trim(new.title)), 0) = 0 then
      raise exception 'Public template title is required';
    end if;

    if coalesce(length(trim(new.description)), 0) = 0 then
      raise exception 'Public template description is required';
    end if;

    if coalesce(length(trim(new.category)), 0) = 0 then
      raise exception 'Public template category is required';
    end if;

    if coalesce(length(trim(new.sample_output)), 0) = 0 then
      raise exception 'Public template sample output is required';
    end if;

    if array_length(new.tags, 1) is null or array_length(new.tags, 1) = 0 then
      raise exception 'Public template tags are required';
    end if;

    if new.published_at is null then
      new.published_at = now();
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_template_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.templates
    set like_count = like_count + 1,
        updated_at = now()
    where id = new.template_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.templates
    set like_count = greatest(like_count - 1, 0),
        updated_at = now()
    where id = old.template_id;
    return old;
  end if;

  return null;
end;
$$;

create index if not exists idx_creator_profiles_handle on public.creator_profiles(handle);
create index if not exists idx_templates_public_popularity on public.templates(is_public, clone_count desc, like_count desc, views_count desc);
create index if not exists idx_templates_category on public.templates(category);
create index if not exists idx_templates_published_at on public.templates(published_at desc);
create index if not exists idx_templates_tags on public.templates using gin(tags);
create index if not exists idx_workspace_templates_workspace on public.workspace_templates(workspace_id, created_at desc);
create index if not exists idx_template_clones_template on public.template_clones(template_id);
create index if not exists idx_template_clones_workspace on public.template_clones(workspace_id);

alter table public.creator_profiles enable row level security;
alter table public.templates enable row level security;
alter table public.workspace_templates enable row level security;
alter table public.template_clones enable row level security;
alter table public.template_likes enable row level security;

drop trigger if exists set_creator_profiles_updated_at on public.creator_profiles;
create trigger set_creator_profiles_updated_at
before update on public.creator_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

drop trigger if exists set_workspace_templates_updated_at on public.workspace_templates;
create trigger set_workspace_templates_updated_at
before update on public.workspace_templates
for each row execute function public.set_updated_at();

drop trigger if exists enforce_template_quality_guardrails_trigger on public.templates;
create trigger enforce_template_quality_guardrails_trigger
before insert or update on public.templates
for each row execute function public.enforce_template_quality_guardrails();

drop trigger if exists sync_template_like_count_trigger on public.template_likes;
create trigger sync_template_like_count_trigger
after insert or delete on public.template_likes
for each row execute function public.sync_template_like_count();

drop policy if exists creator_profiles_public_read on public.creator_profiles;
create policy creator_profiles_public_read on public.creator_profiles
for select to anon, authenticated
using (public_profile_enabled = true);

drop policy if exists creator_profiles_insert_own on public.creator_profiles;
create policy creator_profiles_insert_own on public.creator_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists creator_profiles_update_own on public.creator_profiles;
create policy creator_profiles_update_own on public.creator_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists templates_public_read on public.templates;
create policy templates_public_read on public.templates
for select to anon, authenticated
using (is_public = true);

drop policy if exists templates_owner_read on public.templates;
create policy templates_owner_read on public.templates
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists templates_owner_insert on public.templates;
create policy templates_owner_insert on public.templates
for insert to authenticated
with check (owner_id = auth.uid() and creator_id = auth.uid());

drop policy if exists templates_owner_update on public.templates;
create policy templates_owner_update on public.templates
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists workspace_templates_read_member on public.workspace_templates;
create policy workspace_templates_read_member on public.workspace_templates
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_templates_insert_member on public.workspace_templates;
create policy workspace_templates_insert_member on public.workspace_templates
for insert to authenticated
with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists workspace_templates_update_member on public.workspace_templates;
create policy workspace_templates_update_member on public.workspace_templates
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists template_clones_read_member on public.template_clones;
create policy template_clones_read_member on public.template_clones
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists template_clones_insert_member on public.template_clones;
create policy template_clones_insert_member on public.template_clones
for insert to authenticated
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists template_likes_read_own on public.template_likes;
create policy template_likes_read_own on public.template_likes
for select to authenticated
using (user_id = auth.uid());

drop policy if exists template_likes_insert_own on public.template_likes;
create policy template_likes_insert_own on public.template_likes
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists template_likes_delete_own on public.template_likes;
create policy template_likes_delete_own on public.template_likes
for delete to authenticated
using (user_id = auth.uid());
