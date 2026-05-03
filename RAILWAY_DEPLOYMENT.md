# Railway Deployment

## Core Service (required)

- Deploy `frontend` as Railway Next.js service.
- Set Railway Root Directory to `/frontend`.
- Use public domain: `https://tradepigloball.co`.

## Multiplayer Service (optional, Multiplayer paketi için)

- Unity Linux Dedicated Server build çıktılarını `unity-client/Builds/LinuxDedicatedServer` altında üretin.
- `unity-client/server/Dockerfile` ile dedicated server'ı container olarak paketleyin.
- Railway içinde yeni service adı önerisi: `unity-dedicated-server`.
- Otonom deploy komutu:

```bash
cd unity-client/server
RAILWAY_TOKEN=*** RAILWAY_PROJECT_ID=*** ./deploy-railway.sh
```

Bu script Railway projesine bağlanır, service yoksa oluşturur ve Docker deploy başlatır.

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

Multiplayer service env:
- `UNITY_SERVER_PORT` (default `7777`)
- `PORT` (Railway runtime port)

## Notes

- No separate backend service.
- No `BACKEND_API_URL` requirement for Game Factory routes.
- Unity callback endpoint: `https://tradepigloball.co/api/unity-build-callback`.
