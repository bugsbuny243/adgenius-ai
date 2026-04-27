# Railway Deployment Split

## Service 1: Frontend Web (Next.js)
- **Root directory:** `frontend`
- **Purpose:** UI and browser-safe endpoints/proxies only.
- **Allowed env vars:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `BACKEND_API_URL`

> Do **not** attach secrets (service role keys, GitHub tokens, Unity secrets, Google secrets, encryption keys) to the frontend service.

## Service 2: Backend API (Node.js + TypeScript)
- **Root directory:** `backend`
- **Purpose:** all secret-backed API logic and external provider integrations.
- **Required env vars include:**
  - Supabase service credentials
  - Unity Build Automation credentials + webhook secret
  - GitHub Unity repo token/config
  - Google OAuth/client secret and Play publish defaults
  - Credentials encryption key
  - AI provider config and selected provider API key

The frontend should call backend endpoints through `BACKEND_API_URL`.
