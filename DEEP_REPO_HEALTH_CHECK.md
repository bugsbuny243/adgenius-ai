# KOSCHEI V5 Deep Repo Health Check (2026-05-04)

## 1) Orphaned / Unused / Legacy Files

### High-confidence delete candidates
- `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts`
  - Defines a class that only throws and has no in-repo references.
- `frontend/lib/game-factory/providers/google-play-publisher-provider.ts`
  - Defines a class that only throws and has no in-repo references.
- `frontend/lib/game-factory/providers/github-unity-repo-provider.ts`
  - Defines a class that only throws and has no in-repo references.

### Likely legacy runtime split (needs decision)
- `backend/index.js`
  - Old CommonJS server with placeholder comments/TODOs.
- `backend/src/*.ts`
  - New TypeScript backend implementation exists in parallel, but `package.json` still starts `index.js`.
  - Repo currently has two backend entrypoint worlds.

### Lingering Unity Cloud Build / Groq paths
- `frontend/app/api/koschei/build/route.ts`
  - Still triggers Unity Cloud Build API (`build-api.cloud.unity3d.com`).
- `frontend/app/api/unity-build-callback/route.ts`
  - Explicitly disabled (`410`) but route still present.
- `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts`
  - Legacy provider shim (throw-only).
- `.env.example` and `backend/.env.example`
  - Default `AI_PROVIDER=groq` and `GROQ_API_KEY` still present.
- `backend/src/env.ts`
  - Still validates `GROQ_API_KEY` when provider is `groq`.

## 2) Placeholders / Mock Logic / Fake Success Risks

### Confirmed placeholders/TODO
- `backend/index.js`
  - Explicit placeholder note for Supabase persistence.
  - Explicit TODO to persist build config before Unity trigger.

### Throw-only stubs (non-operational abstractions)
- `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts`
- `frontend/lib/game-factory/providers/google-play-publisher-provider.ts`
- `frontend/lib/game-factory/providers/github-unity-repo-provider.ts`

### Disabled endpoint still publicly routable
- `frontend/app/api/unity-build-callback/route.ts`
  - Always returns `ok: false` with `410 Gone`.

### “Success without work” risk (legacy endpoint)
- `backend/index.js` (`/api/start-build`, `/api/koschei/start-build`)
  - Returns success payload after generating local values/logging, but does not persist/dispatch real build flow.

## 3) Repo Health Operational Truth

### Frontend build state
- `frontend` production build succeeds (`next build` completed with no compile/type errors).
- API routes compile, including legacy Cloud Build endpoints.

### Backend run state (as-is)
- `backend` default start command points to `node index.js`.
- In this environment, start fails immediately due to missing installed dependencies (`express` not found).
- Even when dependencies exist, runtime entrypoint is the legacy `index.js` implementation (not `src/index.ts`).

### Where runtime will hit placeholder/legacy walls
- Any flow relying on old Unity Cloud Build route will hit obsolete integration path.
- Any client/server code expecting provider classes under `frontend/lib/game-factory/providers/*` to do real work will hit immediate throws.
- Backend “start build” legacy routes can report success without real orchestration persistence.

## Action Buckets

### Delete (or archive) first
- `frontend/lib/game-factory/providers/unity-cloud-build-provider.ts`
- `frontend/lib/game-factory/providers/google-play-publisher-provider.ts`
- `frontend/lib/game-factory/providers/github-unity-repo-provider.ts`
- `frontend/app/api/unity-build-callback/route.ts` (if callback path is permanently retired)
- `frontend/app/api/koschei/build/route.ts` (if local CLI backend path fully replaces Cloud Build)

### Replace with real logic / migrate now
- Backend startup wiring in `backend/package.json` + runtime entrypoint consistency (`index.js` vs `src/index.ts`).
- Legacy “success without persistence” behavior in `backend/index.js` endpoints.
- Environment defaults still pointing to Groq in `.env.example` files.
