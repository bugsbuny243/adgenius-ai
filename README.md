# AdGenius Architecture Foundation

This repository now contains a **new architecture baseline** for AdGenius as an independent ad network.

- No Google Ads / Meta Ads / TikTok Ads integrations.
- AI generation/orchestration is designed for Gemini only.
- Web → Go API gateway only (no direct browser Supabase client).

## New stack folders

- `apps/web` (Next.js + TypeScript)
- `services/api-gateway` (Go)
- `services/serving` (Go)
- `services/worker` (Go)
- `services/ai` (Go)
- `internal/shared` (shared Go packages)
- `infra/docker` + `infra/docker-compose.yml`
- `docs`

## Quick start

```bash
make up
```

See:

- `docs/architecture.md`
- `docs/local-development.md`
