# KOSCHEI GAME FACTORY — TAM PIPELINE PROMPT

```
Sen Koschei Game Factory'nin tam çalışır pipeline'ını yazacaksın.

Stack: Next.js 16 App Router, TypeScript strict, @supabase/ssr
Railway env (hepsi mevcut):
  UNITY_ORG_ID, UNITY_PROJECT_ID, UNITY_BUILD_TARGET_ID
  UNITY_SERVICE_ACCOUNT_KEY_ID, UNITY_SERVICE_ACCOUNT_SECRET_KEY
  OPENAI_API_KEY, OPENAI_MODEL_PRIMARY, OPENAI_MODEL_FAST
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

DB Tabloları (kullanacakların):
  unity_game_projects (id, workspace_id, user_id, app_name, user_prompt,
                       package_name, target_platform, status, approval_status,
                       game_brief jsonb, template_id, project_id,
                       created_at, updated_at)
  unity_build_jobs (id, unity_game_project_id, workspace_id,
                    build_target, build_type, status, queued_at,
                    started_at, finished_at, artifact_url, artifact_type,
                    build_logs, error_message, unity_version, worker_id,
                    metadata jsonb, requested_by, created_at, updated_at)
  unity_game_templates (id, slug, title, genre, description, complexity,
                        supported_platforms, unity_version, metadata jsonb,
                        is_active, created_at, updated_at)

Mevcut dosyalar (bunları GÜNCELLE):
  frontend/lib/unity-bridge.ts
  frontend/lib/game-factory/providers/unity-cloud-build-provider.ts
  frontend/app/game-factory/page.tsx
  frontend/app/game-factory/new/page.tsx
  frontend/app/game-factory/[id]/page.tsx
  frontend/app/game-factory/[id]/builds/page.tsx
  frontend/app/game-factory/actions.ts

════════════════════════════════════════
GÖREV 1: frontend/lib/unity-bridge.ts — TAM YENİDEN YAZ
════════════════════════════════════════

Unity Cloud Build API entegrasyonu.
Base URL: https://build-api.cloud.unity3d.com/api/v1

Auth: Basic auth ile
  username = UNITY_SERVICE_ACCOUNT_KEY_ID
  password = UNITY_SERVICE_ACCOUNT_SECRET_KEY
  header: Authorization: Basic base64(keyId:secretKey)

Şu fonksiyonları yaz:

1. triggerBuild(buildTargetId: string): Promise<UnityBuildResponse>
   POST /orgs/{orgId}/projects/{projectId}/buildtargets/{buildTargetId}/builds
   Body: { clean: false, delay: 0 }
   Döner: { build: number, buildTargetId, status, created, links }

2. getBuildStatus(buildTargetId: string, buildNumber: number): Promise<UnityBuildStatus>
   GET /orgs/{orgId}/projects/{projectId}/buildtargets/{buildTargetId}/builds/{buildNumber}
   Döner: { build, status, created, finished, links: { download_primary: { href } } }

3. cancelBuild(buildTargetId: string, buildNumber: number): Promise<void>
   DELETE /orgs/{orgId}/projects/{projectId}/buildtargets/{buildTargetId}/builds/{buildNumber}

4. getBuilds(buildTargetId: string, limit = 10): Promise<UnityBuildStatus[]>
   GET /orgs/{orgId}/projects/{projectId}/buildtargets/{buildTargetId}/builds?per_page={limit}

5. getBuildTargets(): Promise<UnityBuildTarget[]>
   GET /orgs/{orgId}/projects/{projectId}/buildtargets

Type'lar:
  type UnityBuildStatus = 'queued' | 'sentToBuilder' | 'started' | 'restarted' |
    'success' | 'failure' | 'canceled' | 'unknown'

  interface UnityBuildResponse {
    build: number
    buildTargetId: string
    status: UnityBuildStatus
    created: string
    links?: { download_primary?: { href: string } }
  }

Hata handling: 4xx/5xx → throw Error(message)
Tüm env'leri process.env'den al, import 'server-only' ekle.

════════════════════════════════════════
GÖREV 2: frontend/app/api/game-factory/brief/route.ts (YENİ)
════════════════════════════════════════

POST endpoint. Bearer token auth.
Body: { prompt: string, platform: 'android' | 'ios' }

1. Token ile user + workspace doğrula
2. OpenAI ile oyun brief'i oluştur:

   Model: process.env.OPENAI_MODEL_PRIMARY veya 'gpt-4o'
   System prompt:
   "Sen bir oyun tasarımcısısın. Kullanıcının oyun fikrine göre
   yapılandırılmış bir oyun brief'i oluştur. SADECE JSON döndür,
   başka hiçbir şey yazma."

   User prompt: kullanıcının yazdığı

   İstenen JSON formatı:
   {
     "appName": "string (max 30 karakter, Play Store uyumlu)",
     "packageName": "com.koschei.{randomSlug} formatında",
     "genre": "runner | platformer | puzzle | arcade | casual",
     "description": "string (max 80 karakter)",
     "storeShortDescription": "string (max 80 karakter)",
     "storeFullDescription": "string (200-500 karakter)",
     "visualStyle": "string (renk paleti, atmosfer)",
     "controls": "string (dokunmatik kontrol açıklaması)",
     "monetization": "ads | iap | free",
     "targetAge": "kids | all | teens",
     "keyFeatures": ["string", "string", "string"]
   }

3. JSON parse et (```json fence'leri temizle)
4. unity_game_projects tablosuna insert:
   { workspace_id, user_id, app_name, user_prompt: prompt,
     package_name, target_platform: platform,
     status: 'brief_ready', approval_status: 'pending',
     game_brief: parsedJson }
5. { ok: true, projectId, brief } döndür

════════════════════════════════════════
GÖREV 3: frontend/app/api/game-factory/build/route.ts (YENİ)
════════════════════════════════════════

POST endpoint. Bearer token auth.
Body: { projectId: string }

1. Token ile user + workspace doğrula
2. unity_game_projects'ten projeyi çek, user'ın projesi olduğunu doğrula
3. approval_status 'approved' değilse → 403 döndür:
   { ok: false, error: 'Proje onay bekliyor.' }
4. unity-bridge.ts'den triggerBuild() çağır:
   buildTargetId = process.env.UNITY_BUILD_TARGET_ID
5. unity_build_jobs tablosuna insert:
   { unity_game_project_id: projectId,
     workspace_id, requested_by: userId,
     build_target: buildTargetId,
     build_type: 'android',
     status: 'queued',
     queued_at: new Date().toISOString(),
     metadata: { unityBuildNumber: response.build,
                 unityBuildTargetId: response.buildTargetId } }
6. unity_game_projects status'u 'building' yap
7. { ok: true, jobId, unityBuildNumber } döndür

════════════════════════════════════════
GÖREV 4: frontend/app/api/game-factory/build-status/route.ts (YENİ)
════════════════════════════════════════

GET endpoint. Query: ?jobId=xxx
Bearer token auth.

1. unity_build_jobs'tan jobId ile kaydı çek
2. metadata.unityBuildNumber'ı al
3. unity-bridge.ts'den getBuildStatus() çağır
4. Gelen status'a göre DB güncelle:
   - 'success' → status: 'success', artifact_url: links.download_primary.href,
                  finished_at: now, unity_game_projects status: 'build_ready'
   - 'failure' → status: 'failed', error_message, unity_game_projects status: 'failed'
   - 'queued'/'sentToBuilder'/'started' → status: 'running'
5. { ok: true, status, artifactUrl, logs } döndür

════════════════════════════════════════
GÖREV 5: frontend/app/game-factory/new/page.tsx — YENİDEN YAZ
════════════════════════════════════════

'use client' sayfası.

3 adımlı wizard:

ADIM 1 — Fikir
  Büyük textarea: "Oyununu anlat... (örn: 'Türkçe kelime bulmaca oyunu,
  reklamlarla para kazan, sade görsel')"
  Platform seçimi: Android / iOS (sadece Android şimdilik aktif)
  "Brief Oluştur" butonu → POST /api/game-factory/brief
  Loading: "AI brief hazırlıyor..." (skeleton)

ADIM 2 — Brief Önizleme
  Gelen brief'i göster:
  - Uygulama adı
  - Paket adı
  - Tür
  - Store açıklaması
  - Görsel stil
  - Kontroller
  - Anahtar özellikler (listele)
  "Onayla ve Devam Et" butonu → approval_status'u 'approved' yapar
  "Tekrar Oluştur" butonu → adım 1'e dön
  
  (Onay için POST /api/game-factory/approve ile approval_status güncelle)

ADIM 3 — Build Başlat
  "Build Başlat" butonu → POST /api/game-factory/build
  Build başlayınca → /game-factory/{projectId}/builds sayfasına redirect

════════════════════════════════════════
GÖREV 6: frontend/app/api/game-factory/approve/route.ts (YENİ)
════════════════════════════════════════

POST. Body: { projectId: string }
Bearer token auth.
unity_game_projects → approval_status: 'approved', status: 'approved'
{ ok: true } döndür.

════════════════════════════════════════
GÖREV 7: frontend/app/game-factory/[id]/builds/page.tsx — YENİDEN YAZ
════════════════════════════════════════

Server component. Dynamic.

1. unity_game_project'i çek (id ile)
2. unity_build_jobs listele (bu projeye ait, created_at desc)
3. Sayfa:
   - Proje adı + paket adı
   - "Yeni Build Başlat" butonu (approval gerekiyor)
   - Build listesi her satırda:
     * Build numarası (#1, #2...)
     * Durum badge: queued=sarı, running=mavi dönen, success=yeşil, failed=kırmızı
     * Başlangıç zamanı
     * Süre
     * "İndir" butonu (artifact_url varsa, .aab dosyası)
     * "Logs" linki
   - "Yenile" butonu (server action ile revalidate)

BuildStatusPoller:
  'use client' component.
  Eğer aktif running/queued job varsa:
  setInterval ile her 30 saniyede GET /api/game-factory/build-status?jobId=xxx
  Status değişince sayfayı router.refresh() ile güncelle.

════════════════════════════════════════
GÖREV 8: frontend/app/game-factory/page.tsx — YENİDEN YAZ
════════════════════════════════════════

Server component.
workspace'e ait unity_game_projects listele.

Her kart:
  - Uygulama adı + paket adı
  - Status badge:
    brief_ready → "Brief Hazır" (sarı)
    approved → "Onaylandı" (mavi)
    building → "Build Devam Ediyor" (mavi, dönen)
    build_ready → "Build Hazır" (yeşil)
    failed → "Hata" (kırmızı)
  - Son build tarihi
  - "Detay" → /game-factory/{id}
  - "Buildler" → /game-factory/{id}/builds

Üstte: "+ Yeni Proje" → /game-factory/new

Boşsa: "Henüz proje yok. İlk oyununu oluşturmak için başla."
CTA: "Proje Oluştur" → /game-factory/new

════════════════════════════════════════
GÖREV 9: frontend/app/game-factory/[id]/page.tsx — YENİDEN YAZ
════════════════════════════════════════

Proje detay sayfası.

Bölümler:
1. BAŞLIK: app_name + package_name + status badge
2. BRIEF: game_brief jsonb'yi oku ve göster
   (tüm alanlar: açıklama, tür, görsel stil, kontroller, özellikler)
3. SON BUILD: son unity_build_job'u göster
   (durum, tarih, indir butonu)
4. AKSIYONLAR:
   - "Buildleri Gör" → /game-factory/{id}/builds
   - "Yeni Build Başlat" butonu (client button, POST /api/game-factory/build)
   - "Sil" butonu (server action)

════════════════════════════════════════
GÖREV 10: frontend/app/game-factory/actions.ts — YENİDEN YAZ
════════════════════════════════════════

Server actions:

deleteGameProject(projectId: string):
  unity_game_projects sil (user_id = auth.uid() kontrolü)
  revalidatePath('/game-factory')
  redirect('/game-factory')

startBuildAction(projectId: string):
  POST /api/game-factory/build (internal fetch)
  revalidatePath('/game-factory/' + projectId + '/builds')

════════════════════════════════════════
KOD KURALLARI
════════════════════════════════════════

- TypeScript strict, any yasak
- UI tamamen Türkçe
- import 'server-only' tüm lib dosyalarında
- Supabase service client → sadece API route'larda
- RLS'e güven, ekstra yetki kontrolü yapma
- Her dosya COMPLETE
- Loading/error/empty state hepsi var
- Kullanıcıya asla "Unity" iç detaylarını gösterme
  (build number göster ama Unity Cloud API URL'si gösterme)
- AAB download URL'sini doğrudan kullanıcıya ver
```
