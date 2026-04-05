# AgentForge Monorepo (Canonical: `apps/web`)

This repository has completed its **canonical runtime cutover**:

- ✅ **Canonical product runtime:** `apps/web`
- ✅ **Canonical stack:** **Node.js + Next.js 16.2.9 + TypeScript (App Router)**
- ⚠️ **Legacy runtime:** `apps/api` (Python/FastAPI) is retained only for archive/reference and is **non-canonical**.

## Monorepo structure

- `apps/web` — main product application (canonical)
- `apps/api` — legacy FastAPI app (archive/reference only)
- `apps/worker` — legacy/supporting worker code
- `infra/` — local/dev infrastructure helpers

## Product direction

**AgentForge** is a system for creating and running business agents powered by **Gemini**.

Initial product shell routes in the canonical app:

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/agents`
- `/runs`
- `/approvals`

## Local development (default)

From repo root:

```bash
cd apps/web
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build & run (production baseline)

```bash
cd apps/web
npm install
npm run build
npm run start
```

## Environment

Copy web env template:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Minimum recommended variables for cutover:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
- `DATABASE_URL` (if Prisma/database features are enabled)

## Deployment (default: `apps/web`)

Use `apps/web` as the service root in your platform settings.

For Railway:

1. Create/update the main service to point to **`apps/web`** as the root directory.
2. Build command: `npm run build`
3. Start command: `npm run start`
4. Set required environment variables from `apps/web/.env.example`.

> Do not point the primary product service at `apps/api`.

## Legacy app note (`apps/api`)

`apps/api` remains in the repository for migration safety and historical reference. It is **not** the canonical runtime and should not be used as the default deployment target for the product site.
