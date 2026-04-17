-- ════════════════════════════════════════════════════
-- KOSCHEI AI — FULL SCHEMA HARDENING
-- Mevcut tablolar üzerinde çalışır (idempotent)
-- ════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- YARDIMCI FONKSİYONLAR
-- ─────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  )
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspaces
    where id = p_workspace_id and owner_id = auth.uid()
  )
$$;

create or replace function public.increment_usage_counter(
  p_workspace_id uuid, p_month_key text
) returns integer language plpgsql security definer as $$
declare v_count integer;
begin
  insert into public.usage_counters (workspace_id, month_key, runs_count)
  values (p_workspace_id, p_month_key, 1)
  on conflict (workspace_id, month_key)
  do update set
    runs_count = usage_counters.runs_count + 1,
    updated_at = now()
  returning runs_count into v_count;
  return v_count;
end; $$;

-- ─────────────────────────────────────────
-- MEVCUT TABLOLARA EKSİK KOLON/CONSTRAINT EKLE
-- ─────────────────────────────────────────

-- profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- workspaces — constraint'ler
alter table public.workspaces
  drop constraint if exists workspaces_slug_check;
alter table public.workspaces
  add constraint workspaces_slug_length check (char_length(slug) >= 3 and char_length(slug) <= 60);

-- workspace_members — role constraint
alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;
alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner','admin','member'));

-- agent_types — sort_order, model_alias
alter table public.agent_types
  add column if not exists sort_order integer not null default 0,
  add column if not exists model_alias text not null default 'koschei-text-v1',
  add column if not exists capabilities text[] not null default '{}';

-- agent_runs — status constraint, completed_at (zaten var ama emin ol)
alter table public.agent_runs
  add column if not exists completed_at timestamptz,
  drop constraint if exists agent_runs_status_check;
alter table public.agent_runs
  add constraint agent_runs_status_check
  check (status in ('pending','running','completed','failed'));

-- subscriptions — constraint'ler, expires_at
alter table public.subscriptions
  add column if not exists expires_at timestamptz,
  add column if not exists shopier_order_id text,
  drop constraint if exists subscriptions_plan_name_check,
  drop constraint if exists subscriptions_status_check,
  drop constraint if exists subscriptions_run_limit_check;
alter table public.subscriptions
  add constraint subscriptions_plan_name_check check (plan_name in ('free','starter','pro')),
  add constraint subscriptions_status_check check (status in ('active','cancelled','past_due')),
  add constraint subscriptions_run_limit_check check (run_limit > 0);

-- usage_counters — constraint
alter table public.usage_counters
  drop constraint if exists usage_counters_runs_count_check,
  drop constraint if exists usage_counters_month_key_check;
alter table public.usage_counters
  add constraint usage_counters_runs_count_check check (runs_count >= 0),
  add constraint usage_counters_month_key_check check (month_key ~ '^\d{4}-\d{2}$');

-- content_items — eksik kolonlar
alter table public.content_items
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  drop constraint if exists content_items_status_check;
alter table public.content_items
  add constraint content_items_status_check
  check (status in ('draft','ready','published','failed'));

-- publish_jobs — eksik kolonlar
alter table public.publish_jobs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  drop constraint if exists publish_jobs_status_check,
  drop constraint if exists publish_jobs_platform_check;
alter table public.publish_jobs
  add constraint publish_jobs_status_check
  check (status in ('queued','processing','published','failed')),
  add constraint publish_jobs_platform_check
  check (target_platform in ('youtube','instagram','tiktok'));

-- ─────────────────────────────────────────
-- YENİ TABLOLAR
-- ─────────────────────────────────────────

-- Ödemeler tablosu (Shopier entegrasyonu için)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null,
  amount_try integer not null,
  status text not null default 'pending',
  shopier_order_id text,
  shopier_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check check (status in ('pending','completed','failed','refunded')),
  constraint payments_amount_check check (amount_try > 0)
);

-- Davetler tablosu (takım özelliği için)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  constraint invitations_role_check check (role in ('admin','member')),
  constraint invitations_status_check check (status in ('pending','accepted','expired'))
);

-- ─────────────────────────────────────────
-- GEREKSİZ TABLOLAR TEMİZLE
-- ─────────────────────────────────────────

-- workspace_users: workspace_members ile aynı iş yapıyor, gereksiz
-- Varsa ve boşsa sil:
do $$ begin
  if exists (select from information_schema.tables where table_schema='public' and table_name='workspace_users') then
    drop table if exists public.workspace_users cascade;
  end if;
end $$;

-- usage_metering: kullanılmıyor, FK yok, RLS yok
do $$ begin
  if exists (select from information_schema.tables where table_schema='public' and table_name='usage_metering') then
    drop table if exists public.usage_metering cascade;
  end if;
end $$;

-- ─────────────────────────────────────────
-- INDEX'LER
-- ─────────────────────────────────────────

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists idx_workspaces_slug on public.workspaces(slug);
create index if not exists idx_wm_user_id on public.workspace_members(user_id);
create index if not exists idx_wm_workspace_id on public.workspace_members(workspace_id);
create index if not exists idx_agent_types_slug on public.agent_types(slug) where is_active = true;
create index if not exists idx_agent_runs_workspace_created on public.agent_runs(workspace_id, created_at desc);
create index if not exists idx_agent_runs_user_id on public.agent_runs(user_id);
create index if not exists idx_agent_runs_status on public.agent_runs(status) where status in ('pending','running');
create index if not exists idx_saved_outputs_workspace on public.saved_outputs(workspace_id, created_at desc);
create index if not exists idx_projects_workspace on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_project on public.project_items(project_id);
create index if not exists idx_content_items_workspace on public.content_items(workspace_id, created_at desc);
create index if not exists idx_publish_jobs_workspace on public.publish_jobs(workspace_id, queued_at desc);
create index if not exists idx_payments_workspace on public.payments(workspace_id);
create index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_email on public.invitations(email);

-- ─────────────────────────────────────────
-- TRIGGER'LAR (tüm tablolar için updated_at)
-- ─────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','agent_types',
    'agent_runs','saved_outputs','projects','project_items',
    'subscriptions','usage_counters','content_items',
    'publish_jobs','payments'
  ] loop
    execute format('
      drop trigger if exists trg_%1$s_updated_at on public.%1$s;
      create trigger trg_%1$s_updated_at
        before update on public.%1$s
        for each row execute function public.set_updated_at();
    ', t);
  end loop;
end $$;

-- ─────────────────────────────────────────
-- RLS — ETKİNLEŞTİR
-- ─────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.agent_types enable row level security;
alter table public.agent_runs enable row level security;
alter table public.saved_outputs enable row level security;
alter table public.projects enable row level security;
alter table public.project_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.content_items enable row level security;
alter table public.publish_jobs enable row level security;
alter table public.payments enable row level security;
alter table public.invitations enable row level security;

-- ─────────────────────────────────────────
-- RLS POLİTİKALARI — MEVCUT TABLOLARI GÜNCELLE
-- ─────────────────────────────────────────

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid());

-- workspaces
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
drop policy if exists workspaces_insert_owner on public.workspaces;
create policy workspaces_insert_owner on public.workspaces
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner on public.workspaces
  for update to authenticated using (public.is_workspace_owner(id));
drop policy if exists workspaces_delete_owner on public.workspaces;
create policy workspaces_delete_owner on public.workspaces
  for delete to authenticated using (public.is_workspace_owner(id));

-- workspace_members
drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists workspace_members_insert_owner on public.workspace_members;
create policy workspace_members_insert_owner on public.workspace_members
  for insert to authenticated with check (
    user_id = auth.uid() or public.is_workspace_owner(workspace_id)
  );
drop policy if exists workspace_members_update_owner on public.workspace_members;
create policy workspace_members_update_owner on public.workspace_members
  for update to authenticated using (public.is_workspace_owner(workspace_id));
drop policy if exists workspace_members_delete_owner on public.workspace_members;
create policy workspace_members_delete_owner on public.workspace_members
  for delete to authenticated using (public.is_workspace_owner(workspace_id));

-- agent_types (herkes okur)
drop policy if exists agent_types_read_active on public.agent_types;
create policy agent_types_read_active on public.agent_types
  for select to authenticated using (is_active = true);

-- agent_runs
drop policy if exists agent_runs_select_member on public.agent_runs;
create policy agent_runs_select_member on public.agent_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists agent_runs_insert_member on public.agent_runs;
create policy agent_runs_insert_member on public.agent_runs
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );
drop policy if exists agent_runs_update_own on public.agent_runs;
create policy agent_runs_update_own on public.agent_runs
  for update to authenticated using (user_id = auth.uid());

-- saved_outputs
drop policy if exists saved_outputs_select_member on public.saved_outputs;
create policy saved_outputs_select_member on public.saved_outputs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists saved_outputs_insert_member on public.saved_outputs;
create policy saved_outputs_insert_member on public.saved_outputs
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );
drop policy if exists saved_outputs_update_owner on public.saved_outputs;
create policy saved_outputs_update_owner on public.saved_outputs
  for update to authenticated using (user_id = auth.uid());
drop policy if exists saved_outputs_delete_owner on public.saved_outputs;
create policy saved_outputs_delete_owner on public.saved_outputs
  for delete to authenticated using (user_id = auth.uid());

-- projects
drop policy if exists projects_read_member on public.projects;
create policy projects_read_member on public.projects
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists projects_insert_member on public.projects;
create policy projects_insert_member on public.projects
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );
drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects
  for update to authenticated using (user_id = auth.uid());
drop policy if exists projects_delete_owner on public.projects;
create policy projects_delete_owner on public.projects
  for delete to authenticated using (user_id = auth.uid());

-- project_items
drop policy if exists project_items_read_member on public.project_items;
create policy project_items_read_member on public.project_items
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists project_items_insert_member on public.project_items;
create policy project_items_insert_member on public.project_items
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists project_items_update_owner on public.project_items;
create policy project_items_update_owner on public.project_items
  for update to authenticated using (user_id = auth.uid());
drop policy if exists project_items_delete_owner on public.project_items;
create policy project_items_delete_owner on public.project_items
  for delete to authenticated using (user_id = auth.uid());

-- subscriptions
drop policy if exists subscriptions_select_member on public.subscriptions;
create policy subscriptions_select_member on public.subscriptions
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists subscriptions_insert_owner on public.subscriptions;
create policy subscriptions_insert_owner on public.subscriptions
  for insert to authenticated with check (public.is_workspace_owner(workspace_id));
drop policy if exists subscriptions_update_owner on public.subscriptions;
create policy subscriptions_update_owner on public.subscriptions
  for update to authenticated using (public.is_workspace_owner(workspace_id));

-- usage_counters
drop policy if exists usage_counters_select_member on public.usage_counters;
create policy usage_counters_select_member on public.usage_counters
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists usage_counters_insert_member on public.usage_counters;
create policy usage_counters_insert_member on public.usage_counters
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists usage_counters_update_member on public.usage_counters;
create policy usage_counters_update_member on public.usage_counters
  for update to authenticated using (public.is_workspace_member(workspace_id));

-- content_items (YENİ POLİTİKALAR — şu an hiç yok)
drop policy if exists content_items_select on public.content_items;
create policy content_items_select on public.content_items
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists content_items_insert on public.content_items;
create policy content_items_insert on public.content_items
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );
drop policy if exists content_items_update on public.content_items;
create policy content_items_update on public.content_items
  for update to authenticated using (user_id = auth.uid());
drop policy if exists content_items_delete on public.content_items;
create policy content_items_delete on public.content_items
  for delete to authenticated using (user_id = auth.uid());

-- publish_jobs (YENİ POLİTİKALAR — şu an hiç yok)
drop policy if exists publish_jobs_select on public.publish_jobs;
create policy publish_jobs_select on public.publish_jobs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists publish_jobs_insert on public.publish_jobs;
create policy publish_jobs_insert on public.publish_jobs
  for insert to authenticated with check (
    public.is_workspace_member(workspace_id)
  );
drop policy if exists publish_jobs_update on public.publish_jobs;
create policy publish_jobs_update on public.publish_jobs
  for update to authenticated using (public.is_workspace_member(workspace_id));

-- payments (YENİ TABLO)
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using (user_id = auth.uid());
drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated with check (user_id = auth.uid());

-- invitations (YENİ TABLO)
drop policy if exists invitations_select_workspace on public.invitations;
create policy invitations_select_workspace on public.invitations
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists invitations_insert_owner on public.invitations;
create policy invitations_insert_owner on public.invitations
  for insert to authenticated with check (public.is_workspace_owner(workspace_id));
drop policy if exists invitations_update_own on public.invitations;
create policy invitations_update_own on public.invitations
  for update to authenticated using (
    auth.uid() = (select user_id from public.workspace_members where workspace_id = invitations.workspace_id limit 1)
  );

-- ─────────────────────────────────────────
-- AGENT TYPE SEED (8 agent)
-- ─────────────────────────────────────────

insert into public.agent_types
  (slug, name, icon, description, system_prompt, placeholder, capabilities, model_alias, sort_order, is_active)
values
(
  'icerik','İçerik Yazarı','✍️',
  'Blog, landing ve kampanya metinleri üretir.',
  'Sen uzman bir Türkçe içerik stratejisti ve SEO copywritersın. Markdown formatı kullan. Net başlıklar, güçlü CTA, organik anahtar kelime kullanımı ile yaz.',
  'Örn: B2B SaaS ürünüm için landing hero metni yaz.',
  array['text','long_context'],'koschei-text-v1',1,true
),
(
  'eposta','E-posta Uzmanı','📧',
  'Satış, onboarding ve takip e-postaları hazırlar.',
  'Sen dönüşüm odaklı e-posta pazarlama uzmanısın. Her çıktıda: konu satırı + giriş + ana mesaj + CTA yaz. Kısa, ikna edici ve kişiselleştirilmiş ol.',
  'Örn: Demo sonrası 2 adımlı takip e-postası yaz.',
  array['text'],'koschei-text-v1',2,true
),
(
  'sosyal','Sosyal Medya Stratejisti','📱',
  'Platform bazlı içerik takvimi ve viral post metinleri.',
  'Sen platform algoritmalarını bilen sosyal medya stratejistsın. Hook → İçerik → CTA → Hashtag yapısını kullan. Platforma göre ton ayarla.',
  'Örn: LinkedIn için 1 aylık thought leadership takvimi yap.',
  array['text'],'koschei-text-v1',3,true
),
(
  'arastirma','Araştırma Analisti','🔍',
  'Pazar, rakip ve trend analizleri ile içgörü raporları.',
  'Sen analitik araştırma uzmanısın. Bulgu → Analiz → Öneri formatıyla sun. Başlıklar, tablolar ve madde listesi kullan.',
  'Örn: Türkiye e-ticaret pazarında niş fırsat analizi yap.',
  array['text','long_context'],'koschei-text-v1',4,true
),
(
  'rapor','Rapor Yazarı','📊',
  'Yönetici özetleri, KPI raporları ve performans analizleri.',
  'Sen veri odaklı rapor yazarısın. Özet → Bulgular → Öneriler → Aksiyon formatı kullan. Karmaşık veriyi sadeleştir.',
  'Örn: Q2 dijital pazarlama performans raporu yaz.',
  array['text','long_context'],'koschei-text-v1',5,true
),
(
  'eticaret','E-ticaret Uzmanı','🛒',
  'Ürün sayfaları, kampanya metinleri ve kategori açıklamaları.',
  'Sen dönüşüm optimizasyonuna odaklı e-ticaret uzmanısın. Ürün faydalarını öne çıkar, sosyal kanıt kullan, urgency yarat.',
  'Örn: Cilt bakım serumu için premium ürün sayfası yaz.',
  array['text'],'koschei-text-v1',6,true
),
(
  'emlak','Emlak Pazarlama Uzmanı','🏠',
  'İlan metinleri, bölge analizleri ve müşteri iletişimi.',
  'Sen emlak sektörünü iyi bilen pazarlama uzmanısın. Güven veren, net ve ikna edici yaz. Mülkün en güçlü özelliklerini öne çıkar.',
  'Örn: Kadıköy 2+1 satılık daire için premium ilan metni yaz.',
  array['text'],'koschei-text-v1',7,true
),
(
  'yazilim','Yazılım Geliştirici','💻',
  'Teknik dokümantasyon, kod planları ve bug analizleri.',
  'Sen kıdemli full-stack yazılım mühendisi agentsın. Temiz, çalışan, iyi yorumlanmış çıktılar üret. TypeScript strict kullan, edge case''leri ele al.',
  'Örn: Next.js 16''da infinite scroll ile paginated liste yaz.',
  array['text','code','long_context'],'koschei-text-v1',8,true
)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  placeholder = excluded.placeholder,
  capabilities = excluded.capabilities,
  model_alias = excluded.model_alias,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
