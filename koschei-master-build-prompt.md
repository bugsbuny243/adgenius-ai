# KOSCHEI AI — SIFIRDAN TAM KURULUM MASTER PROMPT
# Gemini Full Power + Premium UI + 1M Kullanıcı Mimarisi

---

```
Sen Koschei AI'yı sıfırdan inşa ediyorsun.

TEMEL KURAL: Arka planda Gemini, ön planda sadece "Koschei AI".
Kullanıcı hiçbir zaman Gemini, Google, yapay zeka sağlayıcısı görmez.
Her şey Koschei markası altında sunulur.

════════════════════════════════════════
STACK (değiştirilemez)
════════════════════════════════════════
- Framework : Next.js 16.2.9 (App Router, output: standalone)
- UI        : React 19 + TypeScript strict + Tailwind CSS 4
- Backend   : Supabase (auth + database + storage + realtime)
- AI Engine : @google/genai (Gemini 2.5 Flash/Pro — gizli)
- Deploy    : Railway
- Dil       : UI tamamen Türkçe, kodlar İngilizce

YASAK:
- Python yok
- any tipi yok
- Gemini/Google adı UI'da yok
- Placeholder sayfa yok
- Mock/fake data yok
- External UI kütüphanesi yok (shadcn, MUI, Chakra vb.)
- Sadece Tailwind CSS ile premium UI

════════════════════════════════════════
RAILWAY ENV DEĞİŞKENLERİ
(Sadece bunlar — başka hiçbir şey ekleme)
════════════════════════════════════════
GEMINI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
NEXT_PUBLIC_ADSENSE_CLIENT
NEXT_PUBLIC_ENABLE_ADSENSE

════════════════════════════════════════
PROJE YAPISI
════════════════════════════════════════
apps/web/
  src/
    app/
      (marketing)/          ← Herkese açık
      (protected)/          ← Auth gerekli
      api/                  ← Route handler'lar
    components/
      layout/               ← Navbar, footer, shell
      ui/                   ← Temel bileşenler
      editor/               ← Canlı web editör
      workspace/            ← Agent çalışma alanı
    lib/
      ai/                   ← Gemini wrapper (server-only)
      server/               ← Servis katmanı (server-only)
      supabase/             ← Client + server
    middleware.ts
  supabase/
    migrations/
    seeds/

════════════════════════════════════════════════════════════
BÖLÜM 1: VERİTABANI MİGRASYONU
supabase/migrations/001_koschei_full.sql
════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm; -- full-text search için

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
  do update set runs_count = usage_counters.runs_count + 1, updated_at = now()
  returning runs_count into v_count;
  return v_count;
end; $$;

-- ─────────────────────────────────────────
-- TABLOLAR
-- ─────────────────────────────────────────

-- Kullanıcı profilleri
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Çalışma alanları
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar not null,
  slug varchar not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Üyeler
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role varchar not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  constraint workspace_members_role_check check (role in ('owner','admin','member'))
);

-- Agent tipleri (sistem tanımlı)
create table if not exists public.agent_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default '🤖',
  description text,
  system_prompt text not null,
  placeholder text,
  capabilities text[] not null default '{}',
  -- capabilities: ['text','image_input','code','search','long_context']
  model_alias text not null default 'koschei-text-v1',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent çalışmaları
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type_id uuid references public.agent_types(id) on delete set null,
  agent_slug text not null,
  user_input text not null,
  result_text text,
  model_name text not null default 'koschei-text-v1',
  status text not null default 'pending',
  error_message text,
  tokens_input integer,
  tokens_output integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runs_status_check check (status in ('pending','running','completed','failed')),
  constraint agent_runs_tokens_input_check check (tokens_input is null or tokens_input >= 0),
  constraint agent_runs_tokens_output_check check (tokens_output is null or tokens_output >= 0)
);

-- Kaydedilmiş çıktılar
create table if not exists public.saved_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  title text not null,
  content text not null,
  -- Editör JSON içeriği (canlı editör için)
  editor_content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_run_id, user_id)
);

-- Projeler
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Proje öğeleri
create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  title text not null,
  content text not null,
  editor_content jsonb,
  item_type text not null default 'output',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_items_type_check check (item_type in ('output','note','draft'))
);

-- Abonelikler
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_name text not null default 'free',
  run_limit integer not null default 30,
  status text not null default 'active',
  expires_at timestamptz,
  shopier_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_check check (plan_name in ('free','starter','pro')),
  constraint subscriptions_status_check check (status in ('active','cancelled','past_due')),
  constraint subscriptions_limit_check check (run_limit > 0)
);

-- Kullanım sayaçları
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_key text not null,
  runs_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month_key),
  constraint usage_counters_runs_check check (runs_count >= 0),
  constraint usage_counters_month_check check (month_key ~ '^\d{4}-\d{2}$')
);

-- Ödemeler
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

-- ─────────────────────────────────────────
-- INDEX'LER (1M kullanıcı için)
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
create index if not exists idx_saved_outputs_user on public.saved_outputs(user_id);
create index if not exists idx_projects_workspace on public.projects(workspace_id, created_at desc);
create index if not exists idx_project_items_project on public.project_items(project_id, sort_order);
create index if not exists idx_subscriptions_workspace on public.subscriptions(workspace_id);
create index if not exists idx_usage_workspace_month on public.usage_counters(workspace_id, month_key);
create index if not exists idx_payments_workspace on public.payments(workspace_id);

-- ─────────────────────────────────────────
-- TRIGGER'LAR
-- ─────────────────────────────────────────
-- Her tablo için updated_at trigger
do $$ declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members','agent_types',
    'agent_runs','saved_outputs','projects','project_items',
    'subscriptions','usage_counters','payments'
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
-- RLS
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
alter table public.payments enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid());

-- workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select to authenticated using (public.is_workspace_member(id));
drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update to authenticated using (public.is_workspace_owner(id));
drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces for delete to authenticated using (public.is_workspace_owner(id));

-- workspace_members
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists wm_insert on public.workspace_members;
create policy wm_insert on public.workspace_members for insert to authenticated with check (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
drop policy if exists wm_delete on public.workspace_members;
create policy wm_delete on public.workspace_members for delete to authenticated using (public.is_workspace_owner(workspace_id));

-- agent_types (herkes okuyabilir)
drop policy if exists at_select on public.agent_types;
create policy at_select on public.agent_types for select to authenticated using (is_active = true);

-- agent_runs
drop policy if exists ar_select on public.agent_runs;
create policy ar_select on public.agent_runs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists ar_insert on public.agent_runs;
create policy ar_insert on public.agent_runs for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists ar_update on public.agent_runs;
create policy ar_update on public.agent_runs for update to authenticated using (user_id = auth.uid());

-- saved_outputs
drop policy if exists so_select on public.saved_outputs;
create policy so_select on public.saved_outputs for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists so_insert on public.saved_outputs;
create policy so_insert on public.saved_outputs for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists so_update on public.saved_outputs;
create policy so_update on public.saved_outputs for update to authenticated using (user_id = auth.uid());
drop policy if exists so_delete on public.saved_outputs;
create policy so_delete on public.saved_outputs for delete to authenticated using (user_id = auth.uid());

-- projects
drop policy if exists proj_select on public.projects;
create policy proj_select on public.projects for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists proj_insert on public.projects;
create policy proj_insert on public.projects for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists proj_update on public.projects;
create policy proj_update on public.projects for update to authenticated using (user_id = auth.uid());
drop policy if exists proj_delete on public.projects;
create policy proj_delete on public.projects for delete to authenticated using (user_id = auth.uid());

-- project_items
drop policy if exists pi_select on public.project_items;
create policy pi_select on public.project_items for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists pi_insert on public.project_items;
create policy pi_insert on public.project_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists pi_update on public.project_items;
create policy pi_update on public.project_items for update to authenticated using (user_id = auth.uid());
drop policy if exists pi_delete on public.project_items;
create policy pi_delete on public.project_items for delete to authenticated using (user_id = auth.uid());

-- subscriptions
drop policy if exists sub_select on public.subscriptions;
create policy sub_select on public.subscriptions for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists sub_insert on public.subscriptions;
create policy sub_insert on public.subscriptions for insert to authenticated with check (public.is_workspace_owner(workspace_id));

-- usage_counters
drop policy if exists uc_select on public.usage_counters;
create policy uc_select on public.usage_counters for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists uc_insert on public.usage_counters;
create policy uc_insert on public.usage_counters for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists uc_update on public.usage_counters;
create policy uc_update on public.usage_counters for update to authenticated using (public.is_workspace_member(workspace_id));

-- payments
drop policy if exists pay_select on public.payments;
create policy pay_select on public.payments for select to authenticated using (user_id = auth.uid());

════════════════════════════════════════════════════════════
BÖLÜM 2: SEED DOSYASI
supabase/seeds/001_agents.sql
════════════════════════════════════════════════════════════

-- 12 agent — Gemini'nin tüm gücünü kullanan her biri
insert into public.agent_types
  (slug, name, icon, description, system_prompt, placeholder, capabilities, model_alias, sort_order)
values
(
  'icerik', 'İçerik Yazarı', '✍️',
  'SEO uyumlu blog, landing ve kampanya metinleri üretir.',
  'Sen uzman bir Türkçe içerik stratejisti ve SEO copywritersın. Anahtar kelimeleri organik kullan, kullanıcı niyetine odaklan, net başlıklar ve güçlü CTA''larla yaz. Markdown formatı kullan.',
  'Örn: "Organik bebek bakım ürünleri" için 1500 kelimelik SEO blog yazısı yaz.',
  array['text','long_context'], 'koschei-text-v1', 1
),
(
  'eposta', 'E-posta Uzmanı', '📧',
  'Yüksek açılma oranlı satış, onboarding ve takip e-postaları.',
  'Sen dönüşüm odaklı bir e-posta pazarlama uzmanısın. Her e-postada: güçlü konu satırı, kişisel giriş, tek net mesaj, ikna edici CTA yaz. A/B test önerileri ekle.',
  'Örn: SaaS ürünü için 5 adımlı onboarding e-posta serisi yaz.',
  array['text'], 'koschei-text-v1', 2
),
(
  'arastirma', 'Araştırma Analisti', '🔍',
  'Pazar, rakip ve trend analizleri ile içgörü raporları.',
  'Sen analitik düşünceli bir araştırma uzmanısın. Verileri başlıklar, tablolar ve maddeler halinde sun. Her bölümü: Bulgu → Analiz → Öneri şeklinde yapılandır. Kaynakları belirt.',
  'Örn: Türkiye''de B2B SaaS pazar büyüklüğü ve fırsat analizi yap.',
  array['text','long_context'], 'koschei-pro-v1', 3
),
(
  'kod', 'Kod Geliştirici', '💻',
  'TypeScript, React, SQL ve modern web teknolojileriyle kod üretir.',
  'Sen kıdemli bir full-stack geliştiricisın. Çalışan, temiz, iyi yorumlanmış kod yaz. TypeScript strict kullan, edge case''leri ele al, test senaryoları öner. Kod bloklarını markdown formatıyla ver.',
  'Örn: Next.js 16''da infinite scroll ile paginated API route yaz.',
  array['text','code','long_context'], 'koschei-pro-v1', 4
),
(
  'sosyal', 'Sosyal Medya Stratejisti', '📱',
  'Platform bazlı içerik takvimi ve viral post metinleri.',
  'Sen platform algoritmalarını bilen bir sosyal medya stratejistsın. Her platform için (LinkedIn, Instagram, Twitter/X, TikTok) tonunu ayarla. Hook → İçerik → CTA → Hashtag yapısı kullan.',
  'Örn: Yazılım ajansı için LinkedIn''de 1 aylık thought leadership takvimi yap.',
  array['text'], 'koschei-text-v1', 5
),
(
  'eticaret', 'E-ticaret Uzmanı', '🛒',
  'Ürün sayfaları, kampanya metinleri ve kategori açıklamaları.',
  'Sen dönüşüm optimizasyonuna odaklı bir e-ticaret uzmanısın. Ürün faydalarını öne çıkar, sosyal kanıt kullan, urgency yarat. Her çıktıda SEO başlığı + meta açıklama + ürün metni üret.',
  'Örn: Doğal içerikli cilt bakım serumu için premium ürün sayfası yaz.',
  array['text'], 'koschei-text-v1', 6
),
(
  'rapor', 'Rapor Yazarı', '📊',
  'Yönetici özetleri, KPI raporları ve performans analizleri.',
  'Sen veri odaklı bir iş analisti ve rapor yazarısın. Karmaşık verileri yöneticilerin okuyabileceği formata getir: Özet → Bulgular → Grafikler için açıklama → Öneriler → Sonraki adımlar.',
  'Örn: Q2 dijital pazarlama performansını yönetici özet raporu olarak hazırla.',
  array['text','long_context'], 'koschei-pro-v1', 7
),
(
  'hukuk', 'Hukuki Danışman', '⚖️',
  'Sözleşme taslakları, gizlilik politikaları ve hukuki metinler.',
  'Sen Türk hukuk sistemine hakim bir hukuk danışmanısın. Net, anlaşılır ve koruyucu hukuki metinler üret. Her çıktıya: "Bu metin bilgi amaçlıdır, hukuki tavsiye değildir. Kendi avukatınıza danışın." uyarısı ekle.',
  'Örn: Freelance yazılım hizmeti için NDA içeren hizmet sözleşmesi taslağı hazırla.',
  array['text','long_context'], 'koschei-pro-v1', 8
),
(
  'finans', 'Finansal Analist', '💰',
  'Bütçe planları, yatırım analizleri ve finansal modeller.',
  'Sen deneyimli bir finansal analist ve danışmansın. Sayısal verileri tablolar halinde sun, risk faktörlerini analiz et, senaryo bazlı öneriler ver. Her çıktıya sorumluluk reddi ekle.',
  'Örn: Yıllık 2M TL cirosu olan bir KOBİ için 12 aylık nakit akış projeksiyonu yap.',
  array['text','long_context'], 'koschei-pro-v1', 9
),
(
  'egitim', 'Eğitim İçerik Uzmanı', '📚',
  'Ders planları, eğitim materyalleri ve değerlendirme soruları.',
  'Sen pedagoji bilgisi güçlü bir eğitim içerik tasarımcısısın. Bloom taksonomisini kullan, öğrenme hedeflerini net tanımla, interaktif aktiviteler ekle. Farklı öğrenme stillerine hitap et.',
  'Örn: 10. sınıf biyoloji için DNA replikasyonu konusunda 90 dakikalık ders planı yaz.',
  array['text','long_context'], 'koschei-text-v1', 10
),
(
  'emlak', 'Emlak Pazarlama Uzmanı', '🏠',
  'İlan metinleri, bölge analizleri ve müşteri iletişimi.',
  'Sen emlak sektörünü iyi bilen bir pazarlama uzmanısın. Mülkün en güçlü özelliklerini öne çıkar, alıcı/kiracı profiline uygun dil kullan, güven veren ve ikna edici yaz.',
  'Örn: Beşiktaş''ta satılık 3+1 daire için premium Türkçe ilan metni yaz.',
  array['text'], 'koschei-text-v1', 11
),
(
  'musteri', 'Müşteri Deneyimi Uzmanı', '🎧',
  'Destek yanıtları, şikayet yönetimi ve FAQ içerikleri.',
  'Sen empatiyle şikayet çözen ve müşteriyi elde tutan bir müşteri deneyimi uzmanısın. Her yanıtta: duyguyu onayla → özür + açıklama → somut çözüm → ilişkiyi güçlendir adımlarını izle.',
  'Örn: 3 hafta gecikmeli teslimat şikayeti için profesyonel, empatiyle yazılmış yanıt yaz.',
  array['text'], 'koschei-text-v1', 12
)
on conflict (slug) do update set
  name = excluded.name, icon = excluded.icon,
  description = excluded.description, system_prompt = excluded.system_prompt,
  placeholder = excluded.placeholder, capabilities = excluded.capabilities,
  model_alias = excluded.model_alias, sort_order = excluded.sort_order;

════════════════════════════════════════════════════════════
BÖLÜM 3: GEMİNİ AI KATMANI (server-only)
apps/web/src/lib/ai/index.ts
════════════════════════════════════════════════════════════

import 'server-only';
import { GoogleGenAI } from '@google/genai';

// ─────────────────────────────────────────
// MODEL ALIAS MAP (Koschei → Gemini)
// Kullanıcıya asla gerçek model adı gösterilmez
// ─────────────────────────────────────────
const MODEL_MAP: Record<string, string> = {
  'koschei-text-v1': 'gemini-2.5-flash',
  'koschei-pro-v1': 'gemini-2.5-pro',
  'koschei-fast-v1': 'gemini-2.0-flash',
  'ai-standard': 'gemini-2.5-flash',
};

function resolveModel(alias: string): string {
  return MODEL_MAP[alias] ?? 'gemini-2.5-flash';
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('AI servisi yapılandırılamadı.');
  return new GoogleGenAI({ apiKey });
}

type UsageMeta = { promptTokenCount?: number; candidatesTokenCount?: number };

export type AIRunResult = {
  text: string;
  modelAlias: string;
  tokensInput: number;
  tokensOutput: number;
};

export type AIStreamChunk = { text: string } | { done: true; tokensInput: number; tokensOutput: number };

// ─────────────────────────────────────────
// STANDARD RUN (non-streaming)
// ─────────────────────────────────────────
export async function runAI(params: {
  systemPrompt: string;
  userInput: string;
  modelAlias?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AIRunResult> {
  const modelAlias = params.modelAlias ?? 'koschei-text-v1';
  const client = getClient();

  // Multimodal içerik (görsel varsa)
  type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const contents: ContentPart[] = [{ text: params.userInput }];
  if (params.imageBase64 && params.imageMimeType) {
    contents.unshift({
      inlineData: { mimeType: params.imageMimeType, data: params.imageBase64 },
    });
  }

  const response = await client.models.generateContent({
    model: resolveModel(modelAlias),
    config: { systemInstruction: params.systemPrompt },
    contents: contents.length === 1 ? params.userInput : contents,
  });

  const text = response.text?.trim() ?? '';
  const usage = (response.usageMetadata ?? {}) as UsageMeta;

  return {
    text: text.length > 0 ? text : 'Koschei AI yanıt üretemedi. Lütfen tekrar deneyin.',
    modelAlias,
    tokensInput: usage.promptTokenCount ?? 0,
    tokensOutput: usage.candidatesTokenCount ?? 0,
  };
}

// ─────────────────────────────────────────
// STREAMING RUN
// ─────────────────────────────────────────
export async function* streamAI(params: {
  systemPrompt: string;
  userInput: string;
  modelAlias?: string;
}): AsyncGenerator<AIStreamChunk> {
  const modelAlias = params.modelAlias ?? 'koschei-text-v1';
  const client = getClient();

  const stream = await client.models.generateContentStream({
    model: resolveModel(modelAlias),
    config: { systemInstruction: params.systemPrompt },
    contents: params.userInput,
  });

  let totalInput = 0;
  let totalOutput = 0;

  for await (const chunk of stream) {
    const text = chunk.text ?? '';
    if (text) yield { text };
    const usage = (chunk.usageMetadata ?? {}) as UsageMeta;
    if (usage.promptTokenCount) totalInput = usage.promptTokenCount;
    if (usage.candidatesTokenCount) totalOutput = usage.candidatesTokenCount;
  }

  yield { done: true, tokensInput: totalInput, tokensOutput: totalOutput };
}

// ─────────────────────────────────────────
// EMBEDDING (RAG için hazır)
// ─────────────────────────────────────────
export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('AI servisi yapılandırılamadı.');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.slice(0, 2048) }] },
      }),
    }
  );
  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

════════════════════════════════════════════════════════════
BÖLÜM 4: USAGE & WORKSPACE SERVİSLERİ
════════════════════════════════════════════════════════════

─── apps/web/src/lib/usage.ts ───
(Atomik RPC ile race-condition'sız)

import type { SupabaseClient } from '@supabase/supabase-js';

export function getMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type UsageStatus = {
  planName: string; runLimit: number; runsCount: number;
  remaining: number; isExceeded: boolean; monthKey: string;
};

export async function getUsageStatus(
  supabase: SupabaseClient, workspaceId: string, monthKey = getMonthKey()
): Promise<UsageStatus> {
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions').select('plan_name, run_limit, status')
    .eq('workspace_id', workspaceId).eq('status', 'active').maybeSingle();
  if (subErr) throw new Error(`Abonelik bilgisi alınamadı: ${subErr.message}`);
  if (!sub) throw new Error('Aktif abonelik bulunamadı.');

  const { data: counter } = await supabase
    .from('usage_counters').select('runs_count')
    .eq('workspace_id', workspaceId).eq('month_key', monthKey).maybeSingle();

  const runsCount = counter?.runs_count ?? 0;
  return {
    planName: sub.plan_name, runLimit: sub.run_limit, runsCount,
    remaining: Math.max(0, sub.run_limit - runsCount),
    isExceeded: runsCount >= sub.run_limit, monthKey,
  };
}

export async function assertCanRun(supabase: SupabaseClient, workspaceId: string): Promise<UsageStatus> {
  const usage = await getUsageStatus(supabase, workspaceId);
  if (usage.isExceeded) throw new Error('Aylık kullanım limitine ulaştınız. Planınızı yükseltin.');
  return usage;
}

export async function incrementMonthlyUsage(
  supabase: SupabaseClient, workspaceId: string, monthKey = getMonthKey()
): Promise<number> {
  const { data, error } = await supabase.rpc('increment_usage_counter', {
    p_workspace_id: workspaceId, p_month_key: monthKey,
  });
  if (error) throw new Error(`Kullanım güncellenemedi: ${error.message}`);
  return data as number;
}

════════════════════════════════════════════════════════════
BÖLÜM 5: API ROUTE'LARI
════════════════════════════════════════════════════════════

─── apps/web/src/app/api/agents/stream/route.ts ───
Streaming endpoint — Gemini'nin tüm gücü burada.

import { NextResponse } from 'next/server';
import { streamAI } from '@/lib/ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { assertCanRun, incrementMonthlyUsage, getMonthKey } from '@/lib/usage';
import { resolveWorkspaceContext } from '@/lib/workspace';

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

  const body = await request.json() as { agentSlug?: string; userInput?: string };
  if (!body.agentSlug?.trim() || !body.userInput?.trim())
    return NextResponse.json({ error: 'Agent ve görev metni zorunludur.' }, { status: 422 });

  const supabase = createServerSupabase(accessToken);
  const { user, workspace } = await resolveWorkspaceContext(supabase);

  const { data: agentType } = await supabase
    .from('agent_types').select('id, slug, system_prompt, model_alias, is_active')
    .eq('slug', body.agentSlug).eq('is_active', true).maybeSingle();
  if (!agentType) return NextResponse.json({ error: 'Agent bulunamadı.' }, { status: 404 });

  const usage = await assertCanRun(supabase, workspace.id);

  // Pending run oluştur
  const { data: run } = await supabase.from('agent_runs').insert({
    workspace_id: workspace.id, user_id: user.id,
    agent_type_id: agentType.id, agent_slug: body.agentSlug,
    user_input: body.userInput, model_name: agentType.model_alias ?? 'koschei-text-v1',
    status: 'running',
  }).select('id, created_at').single();
  if (!run) return NextResponse.json({ error: 'Çalışma başlatılamadı.' }, { status: 500 });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let fullText = '';
        for await (const chunk of streamAI({
          systemPrompt: agentType.system_prompt,
          userInput: body.userInput!,
          modelAlias: agentType.model_alias ?? 'koschei-text-v1',
        })) {
          if ('done' in chunk) {
            await supabase.from('agent_runs').update({
              result_text: fullText, status: 'completed',
              tokens_input: chunk.tokensInput, tokens_output: chunk.tokensOutput,
            }).eq('id', run.id);
            await incrementMonthlyUsage(supabase, workspace.id, usage.monthKey);
            send({ done: true, runId: run.id, createdAt: run.created_at });
          } else {
            fullText += chunk.text;
            send({ text: chunk.text });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Koschei AI yanıt üretemedi.';
        await supabase.from('agent_runs').update({ status: 'failed', error_message: msg }).eq('id', run.id);
        send({ error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

─── apps/web/src/app/api/bootstrap/route.ts ───
Yeni kullanıcı için idempotent workspace kurulumu.

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase(accessToken);
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: 'Kullanıcı doğrulanamadı' }, { status: 401 });

  // Zaten workspace var mı?
  const { data: existing } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, existing: true });

  // Workspace oluştur
  const baseSlug = `ws-${user.id.replace(/-/g, '').slice(0, 12)}`;
  let workspaceId: string | null = null;

  for (let i = 0; i < 3; i++) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`;
    const { data: ws, error: wsErr } = await supabase.from('workspaces').insert({
      name: user.email?.split('@')[0] ?? 'Çalışma Alanım',
      slug, owner_id: user.id,
    }).select('id').single();
    if (!wsErr && ws) { workspaceId = ws.id; break; }
    if (wsErr?.code !== '23505') return NextResponse.json({ error: wsErr?.message }, { status: 500 });
  }
  if (!workspaceId) return NextResponse.json({ error: 'Workspace oluşturulamadı.' }, { status: 500 });

  await Promise.all([
    supabase.from('workspace_members').insert({ workspace_id: workspaceId, user_id: user.id, role: 'owner' }),
    supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: user.email?.split('@')[0] }),
    supabase.from('subscriptions').insert({ workspace_id: workspaceId, plan_name: 'free', run_limit: 30, status: 'active' }),
  ]);

  return NextResponse.json({ ok: true, workspaceId });
}

─── apps/web/src/app/api/outputs/save/route.ts ───
(Mevcut pattern ile aynı, editor_content alanı eklendi)

─── apps/web/src/app/api/projects/route.ts ───
GET: Workspace projelerini listele
POST: Yeni proje oluştur (name, description, color)

─── apps/web/src/app/api/projects/[id]/route.ts ───
GET: Proje detayı + items
PUT: Proje güncelle
DELETE: Proje sil

─── apps/web/src/app/api/projects/items/route.ts ───
POST: Projeye çıktı ekle (saved_output_id veya direkt content)
DELETE: Öğe kaldır

════════════════════════════════════════════════════════════
BÖLÜM 6: CANLI WEB EDİTÖR
apps/web/src/components/editor/
════════════════════════════════════════════════════════════

AÇIKLAMA: Dış bağımlılık (Tiptap, Quill vb.) KULLANMA.
Pure React + contentEditable + Tailwind ile premium editör.

─── apps/web/src/components/editor/RichEditor.tsx ───
'use client'

Özellikler:
1. TOOLBAR (inline):
   [ B ] [ I ] [ U ] [ H1 ] [ H2 ] [ — ] [ Madde ] [ Sıralı ] [ Alıntı ] [ Kod ] | [ Kopyala ] [ Temizle ]
   Her buton document.execCommand() ile çalışır (modern tarayıcılarda desteklenir)
   Fallback: selection.toString() + manual HTML replace

2. CONTENT AREA:
   <div contentEditable suppressContentEditableWarning
     className="min-h-[400px] outline-none prose prose-invert max-w-none p-4 text-zinc-100"
     onInput, onPaste, onKeyDown handlers
   />
   - Paste: plain text + markdown → HTML dönüşümü
   - Ctrl+B/I/U kısayolları
   - Tab key → 2 space indent

3. MARKDOWN IMPORT:
   Dışarıdan gelen AI çıktısını (markdown) HTML'e çevir:
   function markdownToHtml(md: string): string — pure fonksiyon
   Desteklenenler: ## başlık, **bold**, *italic*, `code`, ```codeblock```,
                   - madde, 1. sıralı, > alıntı, --- ayırıcı, \n\n paragraf

4. EXPORT:
   getHtml(): string → içeriği HTML olarak döndür
   getText(): string → düz metin
   getMarkdown(): string → HTML → markdown reverse (basit)

5. WORD COUNT:
   Alt çubuk: "{kelime} kelime · {karakter} karakter"
   Gerçek zamanlı güncellenir

6. AUTOSAVE:
   onChange prop — her 2 saniyede bir debounce ile çağrılır
   Dışarıda bir "Kaydedildi" / "Kaydediliyor..." state gösterilir

Props:
  interface RichEditorProps {
    initialHtml?: string;
    initialMarkdown?: string;
    placeholder?: string;
    onChange?: (html: string, text: string) => void;
    readOnly?: boolean;
    className?: string;
  }

─── apps/web/src/components/editor/EditorToolbar.tsx ───
Toolbar bileşeni. Her buton:
  - document.execCommand() command
  - title tooltip
  - active state (selection'a göre)
  - Tailwind styling: zinc-800 bg, hover zinc-700, active indigo-500

════════════════════════════════════════════════════════════
BÖLÜM 7: WORKSPACE ÇALIŞMA ALANI
apps/web/src/app/(protected)/workspace/[type]/page.tsx
════════════════════════════════════════════════════════════

Bu sayfa projenin KALBİ. Kullanıcı buradan:
1. Görev yazar (TaskComposer)
2. AI yanıtını streaming ile alır (ChatThread)
3. Sonucu editörde düzenler (RichEditor)
4. Kaydeder / projeye ekler (SaveBar)
5. Geçmiş çalışmaları görür (RunHistory)

LAYOUT (desktop: 3 panel, mobile: tab bazlı):
┌─────────────────────────────────────────────────────┐
│ Header: {Agent ikon} {Agent adı} · Koschei AI        │
├──────────────┬──────────────────────┬───────────────┤
│ SOL PANEL    │ ORTA PANEL           │ SAĞ PANEL     │
│ (280px)      │ (flex-1)             │ (320px)       │
│              │                      │               │
│ Agent bilgisi│ TaskComposer         │ RunHistory    │
│ + özellikler │ + streaming output   │ (son 20 run)  │
│              │ + RichEditor         │               │
│ Son 5 run    │ + SaveBar            │               │
│ (mini kart)  │                      │               │
└──────────────┴──────────────────────┴───────────────┘

Mobile tab'lar: [ Görev ] [ Sonuç ] [ Geçmiş ]

STREAMING AKIŞI:
async function onRun() {
  setStatus('running'); setStreamText('');
  const token = await getAccessTokenOrThrow();
  const response = await fetch('/api/agents/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agentSlug: type, userInput: input }),
  });
  if (!response.body) { setStatus('error'); return; }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated); }
        if (parsed.done) { setRunId(parsed.runId); setStatus('done'); }
        if (parsed.error) { setStatus('error'); setError(parsed.error); }
      } catch { /* skip malformed */ }
    }
  }
  // Sonucu editöre taşı
  editorRef.current?.setContent(accumulated);
}

════════════════════════════════════════════════════════════
BÖLÜM 8: SAYFALAR (COMPLETE LIST)
════════════════════════════════════════════════════════════

─── MARKETING SAYFALAR ───

apps/web/src/app/(marketing)/page.tsx — ANA SAYFA
Premium hero section:
- "AI Destekli Üretim Çalışma Alanı" başlığı
- 3 özellik kartı (Hız / Kalite / Organizasyon)
- Agent kataloğu (6 card grid, "Tümünü Gör" linki)
- "Nasıl Çalışır" 3 adım bölümü
- Müşteri testimonial bölümü (statik, 3 kart)
- CTA bölümü: "Ücretsiz Başla" + "Agentları İncele"
- AdSense banner (NEXT_PUBLIC_ENABLE_ADSENSE=true ise)
SiteNavbar + SiteFooter

apps/web/src/app/(marketing)/agents/page.tsx — PUBLIC AGENT LİSTESİ
Tüm aktif agentları göster (auth gerektirmez).
Her kart: ikon, ad, açıklama, capabilities badge'leri.
"Kullanmaya Başla" → signup

apps/web/src/app/(marketing)/pricing/page.tsx — FİYATLAR
3 plan kartı:
  Ücretsiz: ₺0, 30 run/ay, 8 agent, "Hemen Başla" → /signup
  Başlangıç: ₺199/ay (yakında), 300 run, tüm agentlar, "Yakında"
  Pro: ₺499/ay (yakında), sınırsız run, API, takım, "Yakında"
SSS (5 soru)

apps/web/src/app/(marketing)/signin/page.tsx
apps/web/src/app/(marketing)/signup/page.tsx
apps/web/src/app/(marketing)/reset-password/page.tsx
apps/web/src/app/(marketing)/update-password/page.tsx
apps/web/src/app/(marketing)/confirm-email/page.tsx
apps/web/src/app/(marketing)/about/page.tsx
apps/web/src/app/(marketing)/contact/page.tsx
apps/web/src/app/(marketing)/privacy/page.tsx
apps/web/src/app/(marketing)/terms/page.tsx

─── PROTECTED SAYFALAR ───

apps/web/src/app/(protected)/dashboard/page.tsx — DASHBOARD
- Kullanım bar (runs used / limit, color coded)
- Plan badge
- Son 6 run (mini kart, agent adı + durum + tarih)
- Son 4 saved output (başlık + agent + tarih)
- Hızlı erişim: 4 sık kullanılan agent kartı (big clickable cards)
- "Yeni Görev Başlat" = büyük CTA → /agents

apps/web/src/app/(protected)/agents/page.tsx — AGENT KATALOĞU
Grid view. Her kart:
  - Büyük ikon (64px emoji)
  - Ad + açıklama
  - Capability badges (Metin / Görsel / Kod / Uzun İçerik)
  - "Çalıştır" butonu → /workspace/{slug}
Skeleton loading

apps/web/src/app/(protected)/workspace/[type]/page.tsx
(Bölüm 7'deki tam açıklama)

apps/web/src/app/(protected)/runs/page.tsx — ÇALIŞMA GEÇMİŞİ
- Cursor-based pagination (20'şerli)
- Agent tipi + durum filtresi
- Her kart: agent adı, girdi özeti, durum, tarih, "Detay" link
- "Yeniden Çalıştır" butonu (aynı input ile)

apps/web/src/app/(protected)/runs/[id]/page.tsx — ÇALIŞMA DETAYI
- Tam girdi + çıktı
- Tokens kullanımı
- Kaydet + Projeye Ekle butonları

apps/web/src/app/(protected)/saved/page.tsx — KAYDEDİLENLER
- Grid/list toggle
- Arama (client-side)
- Her kart: başlık, agent, tarih, "Aç" (editörde) + "Sil" + "Projeye Ekle"
- Tam içerik modal
- Kopyala butonu

apps/web/src/app/(protected)/projects/page.tsx — PROJELER
- Proje listesi (renk badge ile)
- "Yeni Proje" → modal (ad + açıklama + renk seç)
- Her kartta: öğe sayısı + son güncelleme

apps/web/src/app/(protected)/projects/[id]/page.tsx — PROJE DETAYI
- Proje başlığı + açıklama (inline edit)
- Öğe listesi (drag sort, item_type badge)
- Her öğe: başlık, içerik özeti, "Editörde Aç" + "Kaldır"
- "Çıktı Ekle" → saved outputs seçici

apps/web/src/app/(protected)/settings/page.tsx — AYARLAR
4 bölüm:
  1. Profil (e-posta readonly, ad düzenle)
  2. Çalışma Alanı (ad düzenle, Supabase'e kaydet)
  3. Plan & Kullanım (plan adı, usage bar, "Yükselt" butonu)
  4. Hesap (çıkış yap, "Hesabı Sil" kırmızı)

─── GENEL SAYFALAR ───

apps/web/src/app/layout.tsx — ROOT LAYOUT
- metadata: title "Koschei AI", description Türkçe
- AdSense script (NEXT_PUBLIC_ENABLE_ADSENSE=true ise)
- html lang="tr"

apps/web/src/app/not-found.tsx — 404
apps/web/src/app/error.tsx — ERROR BOUNDARY

════════════════════════════════════════════════════════════
BÖLÜM 9: BİLEŞENLER
════════════════════════════════════════════════════════════

apps/web/src/components/layout/navbar.tsx
- Logo: "Koschei" (font-bold)
- Guest: Agentlar / Fiyatlar / Giriş / Kayıt
- Auth: Dashboard / Agentlar / Fiyatlar
- Mobile: hamburger menü (state ile toggle, dış kütüphane yok)

apps/web/src/components/layout/protected-shell.tsx
- Sol sidebar (desktop) / bottom bar (mobile)
- Nav: Çalışma Alanı / Agentlar / Geçmiş / Kaydedilenler / Projeler / Ayarlar
- Plan badge (free/starter/pro) + kalan run sayısı
- Çıkış butonu

apps/web/src/components/ui/skeleton.tsx
Skeleton, SkeletonText, SkeletonCard, SkeletonList

apps/web/src/components/ui/button.tsx
variants: primary | secondary | danger | ghost
sizes: sm | md | lg
loading state (spinner icon — SVG, kütüphane yok)

apps/web/src/components/ui/input.tsx
label, error, helper text destekli

apps/web/src/components/ui/modal.tsx (YENİ)
Generic modal. Props: isOpen, onClose, title, children
Backdrop click + Escape key kapatma
Focus trap

apps/web/src/components/ui/badge.tsx (YENİ)
Küçük badge. variants: default | success | warning | danger | info

════════════════════════════════════════════════════════════
BÖLÜM 10: ADSENSE ENTEGRASYONU
════════════════════════════════════════════════════════════

apps/web/src/components/ui/AdSenseAd.tsx (YENİ)

'use client'

NEXT_PUBLIC_ENABLE_ADSENSE=true olduğunda ve
NEXT_PUBLIC_ADSENSE_CLIENT set edildiğinde render et.

Props: { slot: string; format?: 'auto' | 'rectangle' | 'horizontal' }

Kurallar:
- Sadece marketing sayfalarında (herkese açık)
- Protected (auth) sayfalarda YOK — üretim akışını bozma
- Ana sayfa hero altına 1 banner
- Agent listesi (public) sayfasına 1 banner
- Blog/rehber sayfalarına yan banner

apps/web/src/app/layout.tsx:
NEXT_PUBLIC_ENABLE_ADSENSE=true ise:
  <Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={client}"
    strategy="afterInteractive" crossOrigin="anonymous" />
  next/script kullan (Script component)

apps/web/public/ads.txt:
google.com, pub-{PUBLISHER_ID}, DIRECT, f08c47fec0942fa0

════════════════════════════════════════════════════════════
BÖLÜM 11: MIDDLEWARE & AUTH
apps/web/src/middleware.ts
════════════════════════════════════════════════════════════

Supabase cookie'den token oku, server-side auth kontrol.
Protected rotalar: /dashboard /agents /runs /saved /projects /settings /workspace
Auth rotaları (giriş yapılmışsa dashboard'a yönlendir): /signin /signup

Cookie parse:
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  // JSON parse → access_token → supabase.auth.getUser(token)

export const config = {
  matcher: [
    '/dashboard/:path*', '/agents/:path*', '/runs/:path*',
    '/saved/:path*', '/projects/:path*', '/settings/:path*',
    '/workspace/:path*', '/signin', '/signup',
  ],
};

════════════════════════════════════════════════════════════
BÖLÜM 12: PREMIUM UI TASARIM SİSTEMİ
════════════════════════════════════════════════════════════

RENK PALETİ (Tailwind sınıfları):
- Arka plan: bg-zinc-950 (ana), bg-zinc-900 (kart), bg-zinc-800 (input)
- Sınır: border-zinc-800 (normal), border-zinc-700 (hover)
- Metin: text-zinc-100 (ana), text-zinc-300 (ikincil), text-zinc-500 (placeholder)
- Vurgu: bg-indigo-500 (buton), text-indigo-300 (link), border-indigo-500 (focus)
- Başarı: text-emerald-400, bg-emerald-950/40, border-emerald-800
- Hata: text-rose-300, bg-rose-950/40, border-rose-800
- Uyarı: text-amber-300, bg-amber-950/40

KARTLAR:
rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur

BUTONLAR:
Primary: bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-4 py-2 text-sm font-medium
Secondary: border border-zinc-700 hover:border-zinc-500 text-zinc-200 rounded-lg px-4 py-2 text-sm
Danger: bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 py-2 text-sm

TYPOGRAPHY:
H1: text-3xl md:text-5xl font-bold tracking-tight
H2: text-2xl font-semibold
H3: text-lg font-medium
Body: text-sm text-zinc-300
Caption: text-xs text-zinc-500

GEÇİŞLER: transition-all duration-150 (hızlı, pürüzsüz)

HOVER STATES: Her interaktif eleman için belirgin hover, focus ring (ring-indigo-400/50)

LOADING: animate-pulse (skeleton) + animate-spin (spinner SVG)

PREMIUM DOKUNUŞLAR:
- backdrop-blur-sm arka planlar
- bg-gradient-to-br from-indigo-500/10 to-purple-500/5 hero section
- shadow-lg shadow-indigo-500/5 vurgu kartlar
- Smooth scroll behavior

════════════════════════════════════════════════════════════
BÖLÜM 13: .ENV.EXAMPLE
apps/web/.env.example
════════════════════════════════════════════════════════════

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ENABLE_ADSENSE=false

════════════════════════════════════════════════════════════
BÖLÜM 14: NEXT.CONFIG.TS
apps/web/next.config.ts
════════════════════════════════════════════════════════════

import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};
export default config;

════════════════════════════════════════════════════════════
ÇIKTI KURALLARI
════════════════════════════════════════════════════════════

1. Her dosyayı COMPLETE olarak yaz (hiçbir "// ... rest" yok)
2. Sıra:
   a. supabase/migrations/001_koschei_full.sql
   b. supabase/seeds/001_agents.sql
   c. apps/web/.env.example
   d. apps/web/next.config.ts
   e. apps/web/src/middleware.ts
   f. apps/web/src/lib/ai/index.ts
   g. apps/web/src/lib/usage.ts
   h. apps/web/src/lib/workspace.ts
   i. apps/web/src/lib/supabase/client.ts
   j. apps/web/src/lib/supabase/server.ts
   k. apps/web/src/lib/auth.ts
   l. apps/web/src/lib/api-client.ts
   m. apps/web/src/lib/utils.ts
   n. apps/web/src/lib/server/agent-service.ts
   o. apps/web/src/app/api/bootstrap/route.ts
   p. apps/web/src/app/api/agents/stream/route.ts
   q. apps/web/src/app/api/outputs/save/route.ts
   r. apps/web/src/app/api/projects/route.ts
   s. apps/web/src/app/api/projects/[id]/route.ts
   t. apps/web/src/app/api/projects/items/route.ts
   u. apps/web/src/components/editor/RichEditor.tsx
   v. apps/web/src/components/editor/EditorToolbar.tsx
   w. apps/web/src/components/ui/* (tüm bileşenler)
   x. apps/web/src/components/layout/* (navbar, footer, protected-shell)
   y. apps/web/src/components/workspace/* (TaskComposer, ChatThread, OutputEditor, RunHistory, SaveBar)
   z. apps/web/src/app/layout.tsx
   aa. Tüm marketing sayfalar
   bb. Tüm protected sayfalar
   cc. apps/web/src/app/not-found.tsx
   dd. apps/web/src/app/error.tsx
   ee. apps/web/package.json (name: "koschei-web")
   ff. apps/web/tsconfig.json

3. TypeScript strict — any yasak
4. Server-only dosyalar: import 'server-only' en üstte
5. UI Türkçe, kod/log İngilizce
6. Gemini/Google/AI provider adı UI'da hiçbir zaman geçmesin
7. Placeholder sayfa bırakma — her sayfa çalışan içerikle dolu
8. Her route handler null/undefined kontrolü yap
9. Error state, loading state, empty state — her sayfa için hepsi var
```
