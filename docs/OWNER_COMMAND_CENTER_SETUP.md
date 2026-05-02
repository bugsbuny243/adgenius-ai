# Owner Command Center (Next.js + Supabase)

## Environment Variables
`frontend/.env.local`:

- `OWNER_USER_ID=Efa3145b-2a94-48f2-afc0-d94d7b10dbe7`
- `OWNER_EMAIL=onur24sel@gmail.com`
- `OWNER_GITHUB_OWNER=<github-org-or-user>`
- `OWNER_GITHUB_REPO=Koschei`
- `GITHUB_TOKEN=<fine-grained-token-read-only-commits>`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## SQL rollout
Supabase SQL Editor içinde sırasıyla çalıştırın:

1. `supabase/sql/owner-command-center.sql`

## Routes
- UI: `/owner-panel`
- API: `/api/owner-panel/summary`
- API: `/api/owner-panel/approve`
- API: `/api/owner-panel/github`

## Access Control
`middleware.ts` owner olmayan kullanıcıyı `/` rotasına yönlendirir.
