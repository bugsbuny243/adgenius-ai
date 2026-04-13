# Koschei AI Command Center

Workspace tabanlı bir **AI command center foundation**:
- Next.js App Router + TypeScript + Tailwind
- Supabase Auth + Postgres + RLS
- Gemini-only orchestration (Supabase Edge Function)

## Current product scope

Bu repo artık demo shell olmaktan çıkarılıp şu temel akışlara hizalandı:
- Magic-link login + auth callback bootstrap
- Workspace, membership, profile foundation
- Real dashboard metrics (workspace verisine dayalı)
- Agent registry (Supabase `agent_types`)
- Project list + project detail + project item creation
- Agent run logging + saved outputs
- Minimal subscription / usage awareness

## Tech stack

- `apps/web`: Next.js 16, React 19, TypeScript, Tailwind
- `supabase/schema.sql`: workspace-centric SQL foundation + RLS
- `supabase/functions/gemini-orchestrator/index.ts`: Gemini orchestrator

## Required environment variables

`apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Supabase Edge Function secrets:

```bash
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY
```


## Railway deployment (monorepo note)

Repo root'unda `package.json` olmadığı için Railway/Nixpacks paket yöneticisini otomatik çıkaramayabilir.
Bu repo, kökteki `nixpacks.toml` ile install/build/start adımlarını `apps/web` için açıkça tanımlar.

`nixpacks.toml` komutları hem repo root'tan hem de çalışma dizini zaten `apps/web` ise sorunsuz çalışacak şekilde yazılmıştır.

## Run web app

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Auth + bootstrap flow

1. `/login` magic-link request gönderir.
2. Magic-link `/auth/callback` route'una döner.
3. Callback:
   - session exchange yapar,
   - `profiles` upsert eder,
   - kullanıcıda workspace yoksa default workspace + owner membership + workspace user oluşturur,
   - `subscriptions` ve `usage_counters` için default kayıt açar.
4. User `/dashboard` içinde workspace-backed state görür.

## Main app routes

- `/login`
- `/dashboard`
- `/agents`
- `/projects`
- `/projects/[id]`

## Database notes

`supabase/schema.sql` şu tabloları içerir:
- `workspaces`
- `workspace_members`
- `workspace_users`
- `profiles`
- `agent_types`
- `projects`
- `project_items`
- `agent_runs`
- `saved_outputs`
- `subscriptions`
- `usage_counters`
- `usage_metering`

Legacy/out-of-scope `ad_events` kaldırılmıştır.

## Gemini orchestrator payload (breaking update)

POST body (minimum):

```json
{
  "workspaceId": "uuid",
  "userId": "uuid",
  "agentTypeId": "uuid",
  "userInput": "your prompt"
}
```

Optional fields:
- `projectId`
- `modelName`
- `metadata`
- `saveOutput` (default `true`)

Response includes `runId`, generated `resultText`, and token usage.
