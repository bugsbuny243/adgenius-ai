# Koschei AI Command Center

Workspace tabanlı bir **AI command center foundation**:
- Next.js App Router + TypeScript + Tailwind
- Supabase Auth + Postgres + RLS
- Gemini-only orchestration

## Tech stack

- `frontend`: Next.js 16, React 19, TypeScript, Tailwind
- `backend/supabase/migrations/*`: workspace-centric SQL foundation + RLS

## Project structure

```
project-root/
├── backend/
│   └── supabase/
│       ├── functions/
│       └── migrations/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── scripts/
├── Dockerfile
├── railway.json
└── README.md
```

## Environment variables

Railway (Production) için aşağıdaki değişkenleri **service level** olarak tanımlayın:

### Public (build-time + client)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server (runtime)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

> Not: `NEXT_PUBLIC_*` değişkenleri build-time’da bundle’a gömülür. Bu değerler değişirse **rebuild + redeploy** zorunludur.

## Railway deployment contract (single source of truth)

Bu repo artık Railway’de **yalnızca root-level Dockerfile** ile deploy edilir.

- Root directory: `/` (repo root)
- Builder: Dockerfile
- Runtime start: `node frontend/.next/standalone/server.js`
- Nixpacks ve panel command override kullanılmamalı

`railway.json` bu davranışı standardize eder.

## Railway setup steps

1. Railway service root’unu repo root (`/`) bırakın.
2. Service config’te builder Dockerfile olacak şekilde bırakın (repo `railway.json` ile gelir).
3. Tüm env değişkenlerini girin (yukarıdaki liste).
4. Deploy edin.
5. Health endpoint kontrol edin:
   - `GET /api/health`

## Cache / stale build notu

Aşağıdaki durumlarda clean rebuild yapın:
- `NEXT_PUBLIC_*` değerleri değiştiyse
- önceki yanlış root/build config ile artifact cache oluştuysa

Railway’de yeni deploy sırasında cache’i temizleyip yeniden build alın.

## Local run

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

## Healthcheck response (safe)

`/api/health` sadece status/boolean döner:
- app up/down
- public env ready/missingCount
- server env ready/missingCount
- supabase ready/not ready

Secret değerler response içinde asla dönülmez.
