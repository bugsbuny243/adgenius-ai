# Railway Deployment (Single Service)

## Service

- Deploy only `frontend` as one Railway Next.js service.
- Set Railway Root Directory to `/frontend`.
- Use public domain: `https://tradepigloball.co`.

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

## Notes

- No separate backend service.
- No `BACKEND_API_URL` requirement for Game Factory routes.
- Unity callback endpoint: `https://tradepigloball.co/api/unity-build-callback`.
