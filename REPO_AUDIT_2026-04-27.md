# Repo İnceleme Raporu (2026-04-27)

## 1) PROJE YAPISI (özet)
- **`frontend/`**: Next.js 16 App Router uygulaması; sayfalar `app/`, UI bileşenleri `components/`, servis katmanı `lib/`, runtime/proxy yapılandırmaları kök dosyalarda.
- **`supabase/migrations/`**: Sadece tek migration var; temel şema migrationları repoda yok.
- **`backend/workers/unity/`**: Unity worker sözleşmesi ve örnek payload dökümanı var; çalışan worker kodu bu repoda yok.
- **`docs/` + `README.md`**: Pipeline ve kurulum akışını anlatan dökümantasyon.

## 2) ÇALIŞAN ÖZELLİKLER (kod + build çıktısı)
- **Derlenen API endpoint'leri**: `/api/bootstrap`, `/api/health`, `/api/pricing/game-agent-checkout`, `/api/owner/payments`, `/api/game-factory/{brief,approve,build,build-status,builds/refresh}`, `/api/builds/{refresh,[jobId]/refresh}`.
- **Derlenen sayfalar**: Landing/auth/settings/dashboard/owner/game-factory akışları build sırasında başarıyla üretildi.
- **Auth guard**: `frontend/proxy.ts` ile protected route kontrolü aktif.

## 3) EKSİK PARÇALAR (kritik)
- `frontend/app/game-factory/actions.ts` içindeki release action'ları tamamen `throw new Error('Bu akış yeni pipeline dışında bırakıldı.')` ile stub.
- `frontend/app/game-factory/[id]/release/page.tsx` formları bu stub action'lara bağlı; release UI var ama back-end aksiyonlar yok.
- `backend/workers/unity/` altında gerçek worker implementasyonu yok; sadece contract/README var.

## 4) BUG / TUTARSIZLIK BULGULARI
- `frontend/app/game-factory/[id]/settings/page.tsx` projeyi `game_projects` tablosundan okuyor; diğer Game Factory akışı `unity_game_projects` kullanıyor.
- Legacy endpoint `frontend/app/api/builds/[jobId]/refresh/route.ts` `game_build_jobs` tablosuna bağlı; yeni akış `unity_build_jobs` ile çalışıyor.
- Ortam değişkeni adı tutarsızlığı: bazı yerler `UNITY_SERVICE_ACCOUNT_SECRET_KEY`, bazı yerler `UNITY_SERVICE_ACCOUNT_SECRET` bekliyor.
- Import/TS derleme/lint hatası yok (aşağıdaki testlerde geçti).

## 5) VERİTABANI DURUMU
- Kodda aktif kullanılan ana tablolar: `workspace_members`, `workspaces`, `profiles`, `subscriptions`, `usage_counters`, `payment_orders`, `payments`, `transactions`, `billing_events`, `unity_game_projects`, `unity_build_jobs`, `game_projects`, `game_briefs`, `game_release_jobs`, `game_artifacts`, `user_integrations`, `game_build_jobs`.
- Repo içi migration görünürlüğü yetersiz: sadece `game_build_jobs.build_target_id` ekleyen migration var; geri kalan şema dış bağımlı.
- Bu nedenle "eksik sütun" kontrolü repo içinden kesin doğrulanamıyor; şema drift riski yüksek.

## 6) UNITY ENTEGRASYONU DURUMU
- Build tetikleme ve durum sorgulama kodu mevcut (`unity-bridge`, `game-factory/build`, `build-status`, `builds/refresh`).
- Artifact URL (`download_primary`) alınıp DB'ye yazılıyor.
- Ancak worker tarafı bu repoda olmadığından uçtan uca CI/worker execution doğrulanamıyor.

## 7) GOOGLE PLAY ENTEGRASYONU DURUMU
- Service account JSON kaydetme + şifreleme + OAuth token doğrulama akışı mevcut.
- Android Publisher API adımları (`edits`, `bundles.upload`, `tracks.update`, `commit`) provider sınıfında implemente.
- Buna rağmen release ekranının server action katmanı stub olduğu için kullanıcı arayüzünden yayın akışı fiilen tamamlanmamış.

## 8) ÖNCELİKLİ YAPILACAKLAR
1. **P0**: `game-factory/actions.ts` içindeki release action'larını gerçek DB/API akışına bağla.
2. **P0**: `game-factory/[id]/settings/page.tsx` tablo tutarsızlığını (`game_projects` vs `unity_game_projects`) düzelt.
3. **P0**: Legacy `/api/builds/[jobId]/refresh` endpoint'ini yeni şemaya taşı veya kaldır.
4. **P1**: Supabase temel migrationları repoya ekle (fresh kurulum çalışabilirliği için).
5. **P1**: Env key standardizasyonu yap (`UNITY_SERVICE_ACCOUNT_SECRET` tek anahtar olsun).
6. **P2**: Owner placeholder sayfalarını gerçek içerik ve operasyonel metriklerle doldur.

## Ek A — Dosya Bazlı Envanter
| Dosya | Satır | Ne işe yarıyor? | Eksik/Not |
|---|---:|---|---|
| `frontend/public/ads.txt` | 1 | Statik metin dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/tsconfig.json` | 44 | Yapılandırma/örnek veri dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/scripts/validate-runtime-env.mjs` | 41 | Geliştirme/çalışma zamanı scripti. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/components/ads/AdSenseSlot.tsx` | 82 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/components/pricing/game-agent-package-card.tsx` | 80 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/components/public-site-nav.tsx` | 27 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/components/nav.tsx` | 116 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/components/game-factory/publish-button.tsx` | 29 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/postcss.config.mjs` | 8 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/next-env.d.ts` | 6 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/page.tsx` | 59 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/layout.tsx` | 34 | Next.js layout bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/cookies/page.tsx` | 32 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/not-found.tsx` | 13 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/auth/callback/route.ts` | 37 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/robots.ts` | 16 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/page.tsx` | 69 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/layout.tsx` | 12 | Next.js layout bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/release-jobs/page.tsx` | 15 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/integrations/page.tsx` | 58 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/system/page.tsx` | 5 | Next.js sayfa bileşeni. | Sadece yönlendirme yapıyor, içerik yok. |
| `frontend/app/owner/components/owner-shell.tsx` | 41 | Tekrar kullanılabilir React UI bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/owner-auth.ts` | 49 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-agent-plans.ts` | 119 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/unity-shared.ts` | 98 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/credentials-encryption.ts` | 75 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/unity-bridge.ts` | 244 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-agent-access.ts` | 52 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/env.ts` | 153 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/ai-engine.ts` | 211 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/supabase-service-role.ts` | 25 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/app-origin.ts` | 33 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/users/page.tsx` | 27 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/build-jobs/page.tsx` | 14 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/settings/page.tsx` | 11 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/unity/page.tsx` | 5 | Next.js sayfa bileşeni. | Sadece yönlendirme yapıyor, içerik yok. |
| `frontend/app/owner/subscriptions/page.tsx` | 14 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/game-factory/page.tsx` | 14 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/payments/page.tsx` | 50 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/payments/payment-manager.tsx` | 44 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/owner/logs/page.tsx` | 14 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-factory/providers/google-play-publisher-provider.ts` | 258 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-factory/providers/github-unity-repo-provider.ts` | 278 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts` | 45 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-factory/ui.ts` | 23 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/game-factory/types.ts` | 67 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/pricing/page.tsx` | 34 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/supabase-server.ts` | 68 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/workspace.ts` | 57 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/supabase-browser.ts` | 34 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/lib/lucide-react.tsx` | 133 | Paylaşılan iş mantığı / yardımcı fonksiyonlar. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/package-lock.json` | 6793 | NPM bağımlılık kilit dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/tailwind.config.ts` | 17 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/eslint.config.mjs` | 14 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/contact/page.tsx` | 34 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/signin/page.tsx` | 123 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/settings/page.tsx` | 37 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/settings/layout.tsx` | 9 | Next.js layout bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `supabase/migrations/20260427100000_add_build_target_id_to_game_build_jobs.sql` | 2 | Veritabanı migration dosyası. | Sadece 1 kolon ekliyor; temel şema migrationları repo içinde yok. |
| `.env.example` | 46 | Proje dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `README.md` | 90 | Dokümantasyon. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/settings/integrations/google-play/page.tsx` | 106 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/settings/integrations/google-play/actions.ts` | 74 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/dashboard/page.tsx` | 141 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/dashboard/error.tsx` | 31 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/dashboard/loading.tsx` | 3 | TypeScript/JavaScript kaynak dosyası. | Basit loading bileşeni, detaylı skeleton yok. |
| `frontend/app/confirm-email/page.tsx` | 13 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/login/page.tsx` | 5 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/reset-password/page.tsx` | 70 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/error.tsx` | 32 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/sitemap.ts` | 12 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/terms/page.tsx` | 105 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/owner/payments/route.ts` | 127 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/pricing/game-agent-checkout/route.ts` | 42 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `backend/workers/unity/examples/build-job-payload.json` | 15 | Yapılandırma/örnek veri dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/health/route.ts` | 19 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `backend/workers/unity/README.md` | 66 | Dokümantasyon. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/bootstrap/route.ts` | 140 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `docs/game-factory-real-pipeline.md` | 87 | Dokümantasyon. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/brief/route.ts` | 440 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/build-status/route.ts` | 90 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/approve/route.ts` | 27 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/privacy/page.tsx` | 103 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/build/route.ts` | 104 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/_auth.ts` | 70 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/game-factory/builds/refresh/route.ts` | 167 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/update-password/page.tsx` | 85 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/builds/refresh/route.ts` | 104 | Next.js API route (server endpoint). | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/api/builds/[jobId]/refresh/route.ts` | 97 | Next.js API route (server endpoint). | Legacy game_build_jobs tablosuna bağlı; yeni akıştan kopuk. |
| `frontend/app/globals.css` | 15 | Global stil dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/loading.tsx` | 7 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/package.json` | 33 | Frontend bağımlılıkları ve script komutları. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/proxy.ts` | 104 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/next.config.ts` | 5 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/actions.ts` | 75 | TypeScript/JavaScript kaynak dosyası. | Release aksiyonları bilinçli olarak hata fırlatıyor (tam akış yok). |
| `frontend/app/game-factory/new/page.tsx` | 192 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/page.tsx` | 78 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/about/page.tsx` | 27 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/layout.tsx` | 9 | Next.js layout bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/signup/page.tsx` | 111 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/page.tsx` | 81 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/BuildRowStatusAutoRefresh.tsx` | 52 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/settings/page.tsx` | 74 | Next.js sayfa bileşeni. | unity_game_projects yerine game_projects sorguluyor (tutarsızlık riski). |
| `frontend/app/game-factory/[id]/BuildStatusPoller.tsx` | 33 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/release/page.tsx` | 124 | Next.js sayfa bileşeni. | Formlar mevcut ama bağlı server actionlar çalışmıyor. |
| `frontend/app/game-factory/[id]/StartBuildButton.tsx` | 46 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/BuildStatusAutoRefresh.tsx` | 46 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/builds/page.tsx` | 91 | Next.js sayfa bileşeni. | Belirgin eksik görülmedi (dosya bağlamına göre). |
| `frontend/app/game-factory/[id]/RefreshBuildsButton.tsx` | 47 | TypeScript/JavaScript kaynak dosyası. | Belirgin eksik görülmedi (dosya bağlamına göre). |