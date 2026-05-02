-- 1) Tek owner kimliğini sistem değişkenlerine ekleyin (Supabase SQL Editor)
alter database postgres set app.owner_user_id = 'Efa3145b-2a94-48f2-afc0-d94d7b10dbe7';
alter database postgres set app.owner_email = 'onur24sel@gmail.com';

-- 2) Temel tablolar (yoksa oluştur)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.package_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_name text not null,
  amount numeric(12,2),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.build_statuses (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  status text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 3) RLS aç
alter table public.profiles enable row level security;
alter table public.package_purchases enable row level security;
alter table public.error_logs enable row level security;
alter table public.build_statuses enable row level security;

-- 4) Güvenli helper fonksiyonlar
create or replace function public.current_user_is_owner()
returns boolean
language sql
stable
as $$
  select (
    auth.uid()::text = current_setting('app.owner_user_id', true)
    or lower(coalesce(auth.jwt()->>'email','')) = lower(current_setting('app.owner_email', true))
  );
$$;

-- 5) Politika temizliği
 drop policy if exists "profiles_select_self_or_owner" on public.profiles;
 drop policy if exists "profiles_update_self" on public.profiles;
 drop policy if exists "purchases_select_self_or_owner" on public.package_purchases;
 drop policy if exists "purchases_insert_self" on public.package_purchases;
 drop policy if exists "purchases_owner_update" on public.package_purchases;
 drop policy if exists "owner_only_error_logs" on public.error_logs;
 drop policy if exists "owner_only_build_statuses" on public.build_statuses;

-- 6) Policies
create policy "profiles_select_self_or_owner" on public.profiles
for select using (auth.uid() = id or public.current_user_is_owner());

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "purchases_select_self_or_owner" on public.package_purchases
for select using (auth.uid() = user_id or public.current_user_is_owner());

create policy "purchases_insert_self" on public.package_purchases
for insert with check (auth.uid() = user_id);

create policy "purchases_owner_update" on public.package_purchases
for update using (public.current_user_is_owner()) with check (public.current_user_is_owner());

create policy "owner_only_error_logs" on public.error_logs
for select using (public.current_user_is_owner());

create policy "owner_only_build_statuses" on public.build_statuses
for select using (public.current_user_is_owner());
