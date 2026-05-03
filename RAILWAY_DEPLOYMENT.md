# Railway Deployment (FULL PRODUCTION / LIVE)

> Bu sistemde Beta/Test modları kapalıdır. Tüm dağıtımlar `production` / `live` kanalına yapılır.

## Core Service (required)

- Deploy `frontend` as Railway Next.js service.
- Set Railway Root Directory to `/frontend`.
- Use public domain: `https://tradepigloball.co`.

## Multiplayer Service (Live UE5 Dedicated Server)

- Unity Linux Dedicated Server build çıktılarını `unity-client/Builds/LinuxDedicatedServer` altında üretin.
- `unity-client/server/Dockerfile` ile dedicated server'ı container olarak paketleyin.
- Railway içinde yeni service adı önerisi: `unity-dedicated-server`.
- Otonom deploy komutu:

```bash
cd unity-client/server
RAILWAY_TOKEN=*** RAILWAY_PROJECT_ID=*** ./deploy-railway.sh
```

Bu script Railway projesine bağlanır, service yoksa oluşturur ve Docker deploy başlatır.

Dedicated server yönetimi sipariş sonrası otomatik tetiklenecek şekilde tasarlanmalıdır (order event -> Railway service up).

## Full Production resource profile

- Target allocation (V4 Orchestrator): **1,000 vCPU** ve **1 TB RAM**.
- Build policy: **Unlimited Build**.
- Deployment policy: **Concurrent Deployments enabled**.
- Environment policy: only `production`.

> Not: Gerçek kaynak limitleri Railway plan/hesap kotasına bağlıdır; uygulama katmanı yalnızca production-only akışı zorunlu kılar.

## Environment

Public env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

Server-only env (used by `app/api/**`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UNITY_BUILD_API_KEY`
- `UNITY_ORG_ID`
- `UNITY_PROJECT_ID`
- `UNITY_BUILD_TARGET_ID`
- `UNITY_WEBHOOK_SECRET`
- `GROQ_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_UNITY_REPO_TOKEN`
- `APP_ENV=production`
- `PRIMARY_ASSET_API_URL`
- `PRIMARY_ASSET_API_KEY`

Multiplayer service env:
- `UNITY_SERVER_PORT` (default `7777`)
- `PORT` (Railway runtime port)

## Notes

- No separate backend service.
- No `BACKEND_API_URL` requirement for Game Factory routes.
- Unity callback endpoint: `https://tradepigloball.co/api/unity-build-callback`.
- Primary Asset Generator hattı: Railway üstündeki TripoSR + InstantMesh servisleri.
- Model teslimatı: Production Storage + Unity Addressables.
