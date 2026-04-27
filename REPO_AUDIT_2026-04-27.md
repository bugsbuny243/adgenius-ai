# Repo Tarama Raporu (2026-04-27)

Bu rapor depodaki tüm izlenen dosyalar (`rg --files`) üzerinden hazırlanmıştır.

## 1) Proje Yapısı

- `frontend/`: Next.js 16 uygulaması (App Router, UI, API proxy route'ları, auth/proxy).
- `backend/`: Express tabanlı gizli anahtar kullanan servis (Unity + Google Play + owner endpointleri).
- `supabase/`: Şema notları ve additive migration'lar.
- Kök (`README`, deployment notları, env örnekleri): çalışma/deploy rehberi.

## 2) Çalışan Özellikler

- Frontend API route'ları aktif (14 adet): `bootstrap`, `health`, `pricing`, `owner/payments`, `app-factory/generate`, `game-factory/*`, `builds/*`, `unity-build-callback`.
- Backend endpointleri aktif (16 adet): health, game-factory generate/build/refresh/status/release, Google Play integration, owner dashboard uçları.
- Sayfalar: 34 adet `page.tsx` route'u mevcut (landing, auth, dashboard, settings, owner, game-factory alt akışları).

## 3) Eksik Parçalar

- `backend/workers/unity/` altında çalışan worker kodu yok; README + örnek payload var.
- Frontend provider dosyaları (`frontend/lib/game-factory/providers/*`) backend'e taşınmış stub halinde.
- Owner altındaki bazı sayfalar sadece yönlendirme/placeholder seviyesinde (`owner/system`, `owner/unity`, `login`).

## 4) Bug'lar / Derleme / Lint Bulguları

- **Düzeltilen hata**: `frontend/lib/env.ts` içinde `ServerEnvKey` tipi eksikti; frontend typecheck'i kırıyordu (bu committe düzeltildi).
- **Devam eden lint hatası**: `frontend/app/owner/payments/page.tsx` satır 8'de `any` kullanımı (`@typescript-eslint/no-explicit-any`).
- Backend typecheck/build temiz.

## 5) Veritabanı

- Kodda kullanılan ana tablolar: `unity_game_projects`, `unity_build_jobs`, `game_artifacts`, `game_release_jobs`, `game_projects`, `game_briefs`, `user_integrations`, `integration_credentials`, `workspace_members`, `subscriptions`, `payment_orders`, `profiles`, `billing_events` vb.
- Migrationlar additive uyumluluk yaklaşımıyla yazılmış; sıfırdan kurulum için tam temel şema migration seti repo içinde görünmüyor.
- Şema uyumluluk yaması (`20260428001000`) bazı eksik sütunları ekliyor; bu durum prod'da şema drift geçmişi olduğunu gösteriyor.

## 6) Unity Entegrasyonu

- Build tetikleme: `POST /game-factory/build` -> Unity Cloud Build API.
- Durum sorgulama: `GET /game-factory/build-status`, `POST /game-factory/builds/refresh`.
- Callback: `POST /unity-build-callback` webhook doğrulama + job/artifact güncelleme.
- Artifact işleme: `game_artifacts` tablosuna `artifact_type`/`file_url` ile upsert-kayıt var.
- Risk: worker execution bu repoda olmadığı için uçtan uca asenkron iş katmanı doğrulanamıyor.

## 7) Google Play Entegrasyonu

- Service account doğrulama: JWT ile OAuth token alma + test.
- Yayın akışı: `edits insert` -> AAB upload -> `tracks.update` -> `edits.commit` backend'de uygulanmış.
- Frontend release sayfası publish action'ı backend `/game-factory/release/publish` endpointine bağlı ve çalışır durumda; ancak entegrasyon seçimi `game_projects`/`unity_game_projects` ilişkisinin dolu olmasına bağlı.

## 8) Öncelikli Yapılacaklar (Öncelik Sırasıyla)

1. P0: `frontend/app/owner/payments/page.tsx` lint hatasını gider (strict typing).
2. P0: `game_projects` ve `unity_game_projects` kullanımını tekleştir (özellikle settings + release bağlamında).
3. P0: Legacy `api/builds/*` yollarını yeni `unity_build_jobs` odaklı akışa konsolide et.
4. P1: Unity worker implementasyonunu repoya ekle veya ayrı repo kontratını CI ile doğrula.
5. P1: Supabase temel migration geçmişini repo içine ekle (fresh bootstrap güvenilirliği).
6. P2: Placeholder owner sayfalarını gerçek operasyonel panellerle doldur.

## Dosya Bazlı Envanter (Tüm Dosyalar)

| Dosya | Satır | Ne işe yarıyor? | Eksik/Not |
|---|---:|---|---|
| `.env.example` | 36 | Örnek ortam değişkenleri | Belirgin eksik gözlenmedi |
| `frontend/package-lock.json` | 6794 | Bağımlılık kilit dosyası | Belirgin eksik gözlenmedi |
| `frontend/package.json` | 34 | Paket ve script tanımları | Belirgin eksik gözlenmedi |
| `frontend/next.config.ts` | 6 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/.env.example` | 5 | Örnek ortam değişkenleri | Belirgin eksik gözlenmedi |
| `frontend/next-env.d.ts` | 7 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/postcss.config.mjs` | 9 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/lib/owner-auth.ts` | 50 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/game-agent-access.ts` | 53 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/backend-api.ts` | 32 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/app-origin.ts` | 34 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/supabase-browser.ts` | 35 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/supabase-service-role.ts` | 5 | Frontend paylaşılan yardımcı/iş mantığı modülü | Frontend stub: implementasyon backend servise taşınmış |
| `frontend/lib/workspace.ts` | 58 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/env.ts` | 62 | Frontend paylaşılan yardımcı/iş mantığı modülü | Bu incelemede ServerEnvKey tip eksikliği düzeltildi |
| `frontend/lib/ai-engine.ts` | 212 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/tsconfig.json` | 45 | Yapılandırma/örnek veri | Belirgin eksik gözlenmedi |
| `frontend/lib/game-factory/providers/github-unity-repo-provider.ts` | 6 | Frontend paylaşılan yardımcı/iş mantığı modülü | Frontend stub: implementasyon backend servise taşınmış |
| `frontend/lib/game-factory/providers/google-play-publisher-provider.ts` | 6 | Frontend paylaşılan yardımcı/iş mantığı modülü | Frontend stub: implementasyon backend servise taşınmış |
| `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts` | 6 | Frontend paylaşılan yardımcı/iş mantığı modülü | Frontend stub: implementasyon backend servise taşınmış |
| `frontend/lib/game-factory/types.ts` | 68 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/game-factory/ui.ts` | 24 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/game-agent-plans.ts` | 120 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/lucide-react.tsx` | 134 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/unity-shared.ts` | 99 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/credentials-encryption.ts` | 5 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/supabase-server.ts` | 69 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/backend-server.ts` | 21 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/lib/unity-bridge.ts` | 7 | Frontend paylaşılan yardımcı/iş mantığı modülü | Belirgin eksik gözlenmedi |
| `frontend/tailwind.config.ts` | 18 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/proxy.ts` | 105 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/components/pricing/game-agent-package-card.tsx` | 81 | Yeniden kullanılabilir React UI bileşeni | Belirgin eksik gözlenmedi |
| `frontend/components/public-site-nav.tsx` | 28 | Yeniden kullanılabilir React UI bileşeni | Belirgin eksik gözlenmedi |
| `frontend/components/ads/AdSenseSlot.tsx` | 83 | Yeniden kullanılabilir React UI bileşeni | Belirgin eksik gözlenmedi |
| `frontend/components/nav.tsx` | 117 | Yeniden kullanılabilir React UI bileşeni | Belirgin eksik gözlenmedi |
| `frontend/components/game-factory/publish-button.tsx` | 30 | Yeniden kullanılabilir React UI bileşeni | Belirgin eksik gözlenmedi |
| `frontend/public/ads.txt` | 2 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/scripts/validate-runtime-env.mjs` | 28 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/eslint.config.mjs` | 15 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `RAILWAY_DEPLOYMENT.md` | 22 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `README.md` | 37 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `supabase/MIGRATION_CHECKLIST.md` | 17 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `supabase/SCHEMA_OVERVIEW.md` | 20 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `supabase/README.md` | 55 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `supabase/migrations/20260428001100_drop_old_broad_rls_policies.sql` | 84 | Supabase SQL migration dosyası | Belirgin eksik gözlenmedi |
| `supabase/migrations/20260428001000_existing_schema_compatibility_patch.sql` | 87 | Supabase SQL migration dosyası | Belirgin eksik gözlenmedi |
| `REPO_AUDIT_2026-04-27.md` | 196 | Dokümantasyon | Belirgin eksik gözlenmedi |
| `frontend/app/settings/integrations/google-play/page.tsx` | 107 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/settings/integrations/google-play/actions.ts` | 55 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/settings/layout.tsx` | 10 | Next.js layout bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/settings/page.tsx` | 38 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/reset-password/page.tsx` | 71 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `backend/package-lock.json` | 1660 | Bağımlılık kilit dosyası | Belirgin eksik gözlenmedi |
| `backend/src/auth.ts` | 50 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/src/google-play.ts` | 121 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/src/index.ts` | 596 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/src/env.ts` | 61 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/src/credentials-encryption.ts` | 48 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/src/unity-bridge.ts` | 142 | Backend Express API kaynak kodu | Belirgin eksik gözlenmedi |
| `backend/package.json` | 23 | Paket ve script tanımları | Belirgin eksik gözlenmedi |
| `backend/.env.example` | 22 | Örnek ortam değişkenleri | Belirgin eksik gözlenmedi |
| `backend/tsconfig.json` | 14 | Yapılandırma/örnek veri | Belirgin eksik gözlenmedi |
| `frontend/app/owner/subscriptions/page.tsx` | 11 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/settings/page.tsx` | 12 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/integrations/page.tsx` | 19 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/build-jobs/page.tsx` | 11 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `backend/workers/unity/README.md` | 67 | Dokümantasyon | Worker implementasyonu repoda yok, sadece sözleşme var |
| `frontend/app/owner/system/page.tsx` | 6 | Next.js sayfa bileşeni (UI route) | Sadece yönlendirme yapıyor |
| `frontend/app/owner/payments/payment-manager.tsx` | 45 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/owner/payments/page.tsx` | 28 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `backend/workers/unity/examples/build-job-payload.json` | 16 | Yapılandırma/örnek veri | Belirgin eksik gözlenmedi |
| `backend/scripts/check-supabase-schema.mjs` | 72 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/owner/release-jobs/page.tsx` | 11 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/users/page.tsx` | 20 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/layout.tsx` | 13 | Next.js layout bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/owner/page.tsx` | 64 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/signup/page.tsx` | 112 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/sitemap.ts` | 13 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/layout.tsx` | 35 | Next.js layout bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/privacy/page.tsx` | 104 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/page.tsx` | 60 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/components/owner-shell.tsx` | 42 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/owner/game-factory/page.tsx` | 11 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/contact/page.tsx` | 35 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/logs/page.tsx` | 11 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/signin/page.tsx` | 124 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/owner/unity/page.tsx` | 6 | Next.js sayfa bileşeni (UI route) | Sadece yönlendirme yapıyor |
| `frontend/app/globals.css` | 16 | Global stil dosyası | Belirgin eksik gözlenmedi |
| `frontend/app/update-password/page.tsx` | 86 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/new/page.tsx` | 193 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/pricing/page.tsx` | 35 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/login/page.tsx` | 6 | Next.js sayfa bileşeni (UI route) | Sadece yönlendirme yapıyor |
| `frontend/app/game-factory/[id]/settings/page.tsx` | 67 | Next.js sayfa bileşeni (UI route) | game_projects sorgusu kullanıyor; diğer akış unity_game_projects kullanıyor |
| `frontend/app/auth/callback/route.ts` | 38 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/error.tsx` | 33 | Next.js durum/feedback bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/robots.ts` | 17 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/BuildStatusAutoRefresh.tsx` | 77 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/release/page.tsx` | 125 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/cookies/page.tsx` | 33 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/page.tsx` | 79 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/actions.ts` | 244 | Kaynak kod / yapılandırma | Release/publish akışı backend endpointine bağlı; UI bağımlılığı yüksek |
| `frontend/app/game-factory/[id]/builds/page.tsx` | 107 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/BuildListAutoRefresh.tsx` | 112 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/RefreshBuildsButton.tsx` | 56 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/BuildStatusPoller.tsx` | 34 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/BuildRowStatusAutoRefresh.tsx` | 88 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/BuildStatusPageAutoReload.tsx` | 23 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/page.tsx` | 175 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/[id]/StartBuildButton.tsx` | 47 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/game-factory/layout.tsx` | 10 | Next.js layout bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/about/page.tsx` | 28 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/loading.tsx` | 8 | Next.js durum/feedback bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/dashboard/error.tsx` | 32 | Next.js durum/feedback bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/dashboard/page.tsx` | 142 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/dashboard/loading.tsx` | 4 | Next.js durum/feedback bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/not-found.tsx` | 14 | Next.js durum/feedback bileşeni | Belirgin eksik gözlenmedi |
| `frontend/app/confirm-email/page.tsx` | 14 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/terms/page.tsx` | 106 | Next.js sayfa bileşeni (UI route) | Belirgin eksik gözlenmedi |
| `frontend/app/api/health/route.ts` | 16 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/owner/payments/route.ts` | 25 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/pricing/game-agent-checkout/route.ts` | 43 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/app-factory/generate/route.ts` | 378 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/builds/[jobId]/refresh/route.ts` | 19 | Next.js API route (backend proxy/server endpoint) | Legacy endpoint; yeni tablo/akışla paralel yaşıyor |
| `frontend/app/api/builds/refresh/route.ts` | 7 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/unity-build-callback/route.ts` | 17 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/bootstrap/route.ts` | 141 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/builds/refresh/route.ts` | 7 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/approve/route.ts` | 28 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/build-status/route.ts` | 21 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/brief/route.ts` | 441 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/_auth.ts` | 71 | Kaynak kod / yapılandırma | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/build/route.ts` | 7 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |
| `frontend/app/api/game-factory/generate/route.ts` | 7 | Next.js API route (backend proxy/server endpoint) | Belirgin eksik gözlenmedi |