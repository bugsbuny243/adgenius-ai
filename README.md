# Koschei AI Command Center

## Service split

- `frontend/` is browser-safe only.
- `backend/` owns all secret-backed operations.
- `supabase/migrations/` contains compatibility patches for existing production schema.

## Frontend env (safe only)

Use these in `frontend/.env` and frontend Railway service:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `BACKEND_API_URL`

Do **not** put service role, Unity, GitHub, Google secrets, or encryption keys in frontend.

## Backend env

Backend service receives:

- Supabase service role credentials
- Unity credentials and webhook secret
- GitHub Unity repo token/config
- Google credentials
- AI provider keys
- credentials encryption key

## Schema notes

- `user_integrations.encrypted_credentials` is **deprecated compatibility**.
- `integration_credentials` is backend-only credential storage.
- `game_artifacts.build_job_id` is legacy.
- `game_artifacts.unity_build_job_id` is canonical for Unity builds.
