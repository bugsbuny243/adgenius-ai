# Koschei AI — Tam Kurulum (Next.js + Supabase + Koschei Engine)

Bu proje **Next.js 16.2.9 + React 19 + TypeScript strict + Tailwind CSS 4** ile kuruldu.
Arka planda model çağrıları server-side yapılır, kullanıcı arayüzünde yalnızca **Koschei AI** markası görünür.

## Stack
- Framework: Next.js 16.2.9 (App Router, `output: standalone`)
- UI: React 19 + TypeScript strict + Tailwind CSS 4
- Backend: Supabase (Auth, DB, RLS)
- AI Engine: `@google/genai` (server-only wrapper)
- Deploy: Railway

## Railway Environment Variables
Sadece aşağıdaki değişkenleri kullanın:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ENABLE_ADSENSE`

## Proje Yapısı
- `apps/web/src/app/(marketing)` → herkese açık sayfalar
- `apps/web/src/app/(protected)` → auth gerektiren sayfalar
- `apps/web/src/app/api` → route handlers
- `apps/web/src/components` → layout/ui/editor/workspace bileşenleri
- `apps/web/src/lib/ai` → server-only model wrapper
- `apps/web/src/lib/server` → iş kuralları ve servis katmanı
- `apps/web/src/lib/supabase` → browser/server client
- `apps/web/supabase/migrations` → SQL migration
- `apps/web/supabase/seeds` → seed dosyaları

## Kurulum
```bash
cd apps/web
npm install
npm run dev
```

## Supabase
1. `apps/web/supabase/migrations/001_koschei_full.sql` çalıştırın.
2. `apps/web/supabase/seeds/001_agent_types.sql` çalıştırın.
3. Auth kullanıcı girişinden sonra `workspace_members` kayıtları ile erişimi yönetin.

## 1M Kullanıcı Ölçek Notları
- `agent_runs` tablosu aylık partitioning ile büyütülmeli.
- `usage_counters` ile aylık kotayı transaction içinde yönetin.
- API route’lar queue / worker ile asenkronlaştırılmalı.
- Railway üzerinde yatay ölçek + read replica + cache katmanı önerilir.
