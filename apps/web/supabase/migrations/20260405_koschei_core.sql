-- Koschei core schema (Supabase-native)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  description text not null,
  system_prompt text not null,
  placeholder text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid not null references public.agent_types(id) on delete restrict,
  user_input text not null,
  model_name text not null,
  result_text text,
  status text not null default 'pending',
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_name text not null,
  task_limit integer not null default 100,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key)
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists usage_counters_touch_updated_at on public.usage_counters;
create trigger usage_counters_touch_updated_at
before update on public.usage_counters
for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.agent_types enable row level security;

-- Profiles
create policy if not exists "profiles_select_own" on public.profiles
for select using (id = auth.uid());

create policy if not exists "profiles_insert_own" on public.profiles
for insert with check (id = auth.uid());

create policy if not exists "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces
create policy if not exists "workspaces_select_member" on public.workspaces
for select using (public.is_workspace_member(id));

create policy if not exists "workspaces_insert_owner" on public.workspaces
for insert with check (owner_id = auth.uid());

create policy if not exists "workspaces_update_owner" on public.workspaces
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Workspace members
create policy if not exists "workspace_members_select_member" on public.workspace_members
for select using (public.is_workspace_member(workspace_id));

create policy if not exists "workspace_members_insert_owner" on public.workspace_members
for insert with check (
  user_id = auth.uid() or exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

-- Agent types read-only for authenticated users
create policy if not exists "agent_types_select_authenticated" on public.agent_types
for select using (auth.uid() is not null and is_active = true);

-- Agent runs
create policy if not exists "agent_runs_select_member" on public.agent_runs
for select using (public.is_workspace_member(workspace_id));

create policy if not exists "agent_runs_insert_member" on public.agent_runs
for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- Saved outputs
create policy if not exists "saved_outputs_select_member" on public.saved_outputs
for select using (public.is_workspace_member(workspace_id));

create policy if not exists "saved_outputs_insert_member" on public.saved_outputs
for insert with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

-- Subscriptions
create policy if not exists "subscriptions_select_member" on public.subscriptions
for select using (public.is_workspace_member(workspace_id));

create policy if not exists "subscriptions_insert_owner" on public.subscriptions
for insert with check (
  exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

-- Usage counters
create policy if not exists "usage_select_member" on public.usage_counters
for select using (public.is_workspace_member(workspace_id));

create policy if not exists "usage_insert_member" on public.usage_counters
for insert with check (public.is_workspace_member(workspace_id));

create policy if not exists "usage_update_member" on public.usage_counters
for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

insert into public.agent_types (slug, name, icon, description, system_prompt, placeholder, is_active)
values
('icerik', 'İçerik Agentı', '✍️', 'Blog, landing ve sosyal metinler üretir.', 'Sen uzman bir içerik stratejisti ve metin yazarısın. Sonucu net, uygulanabilir ve Türkçe ver.', 'Örn: SaaS ürünüm için dönüşüm odaklı landing sayfası metni hazırla.', true),
('eposta', 'E-posta Agentı', '📧', 'Satış, onboarding ve takip e-postaları hazırlar.', 'Sen B2B e-posta yazımında uzmansın. Sonuçları kısa, ikna edici ve aksiyon odaklı yaz.', 'Örn: Deneme kullanan ama ödeme yapmayan kullanıcıya takip e-postası yaz.', true),
('arastirma', 'Araştırma Agentı', '🔎', 'Pazar ve rakip analizi çerçevesi çıkarır.', 'Sen kıdemli bir pazar araştırmacısısın. Varsayımları açıkça belirt ve maddeli çıktılar üret.', 'Örn: Türkiye e-ticaret CRM araçları için rakip analizi çıkar.', true),
('eticaret', 'E-Ticaret Agentı', '🛒', 'Ürün sayfası, kampanya ve satış kurguları üretir.', 'Sen performans odaklı bir e-ticaret danışmanısın. Çıktıları ölçülebilir aksiyonlara dönüştür.', 'Örn: Cilt bakım ürünü için dönüşüm artıran ürün sayfası taslağı yaz.', true),
('sosyal', 'Sosyal Agentı', '📱', 'Sosyal medya içerik planı ve post metni oluşturur.', 'Sen sosyal medya stratejisti olarak çalışıyorsun. Platforma göre ton ve format öner.', 'Örn: 1 haftalık LinkedIn içerik planı oluştur.', true),
('rapor', 'Rapor Agentı', '📊', 'Veri özetleri ve yönetici raporları hazırlar.', 'Sen yönetici raporlama uzmanısın. Sonuçları net başlıklar ve kısa özetlerle sun.', 'Örn: Aylık büyüme verilerini yönetici özeti formatında raporla.', true),
('emlak', 'Emlak Agentı', '🏠', 'İlan metni, müşteri yanıtı ve portföy anlatımı üretir.', 'Sen emlak pazarlamasında uzmansın. Metinleri güven verici ve satış odaklı oluştur.', 'Örn: 3+1 daire için premium ilan metni yaz.', true),
('yazilim', 'Yazılım Agentı', '💻', 'Teknik çözüm taslağı, PRD ve görev planı çıkarır.', 'Sen kıdemli bir yazılım mimarısın. Çözümleri aşama aşama ve uygulanabilir yaz.', 'Örn: Çok kiracılı SaaS için teknik backlog oluştur.', true)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  placeholder = excluded.placeholder,
  is_active = excluded.is_active;
