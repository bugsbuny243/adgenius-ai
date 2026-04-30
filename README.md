# Koschei AI Command Center

## Monorepo Structure

- `backend/` → Mevcut API katmanı. Supabase/Railway ile deploy edilen backend servis kodu burada bulunur.
- `unity-client/` → Yeni ve sıfırdan oluşturulacak Unity projesi için ayrılmış dizin.
- `shared/` → (Opsiyonel) Backend ve Unity arasında paylaşılan içerikler: OpenAPI şemaları, ortak dokümanlar ve örnek payload'lar.
- `docs/` → Kurulum, operasyon ve deploy dokümantasyonu.

## Railway production topology

- Single Railway service: `frontend/` (Next.js).
- Railway Root Directory: `/frontend`.
- Public domain: `https://tradepigloball.co`.
- Game Factory API runs directly inside `frontend/app/api/**`.
- `BACKEND_API_URL` is not required for Game Factory routes.

## Server env (Next.js API only)

Keep these server-only values in the Railway service environment:

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

Unity webhook callback URL:

- `https://tradepigloball.co/api/unity-build-callback`

## Schema notes

- `game_artifacts.build_job_id` is legacy.
- Unity builds must use `game_artifacts.unity_build_job_id`.
