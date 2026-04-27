# Railway Deployment Split

## Frontend service (`frontend`)
Allowed env only:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `BACKEND_API_URL`

No service role and no provider secrets on frontend.

## Backend service (`backend`)
Holds all secrets:
- Supabase service role
- Unity org/project/build/webhook credentials
- GitHub Unity repo token
- Google secrets
- AI provider keys
- `KOSCHEI_CREDENTIALS_ENCRYPTION_KEY`

Frontend API routes can proxy to backend via `BACKEND_API_URL`.
