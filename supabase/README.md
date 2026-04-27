# Supabase Database Foundation

This folder contains the **schema-first, additive migration baseline** for AdGenius AI.

## What this includes

- Core identity/workspace model.
- Billing/usage model.
- Game Factory model (projects, briefs, builds, artifacts, releases).
- Integrations and credential envelope tables.
- Ops/job/webhook/audit/security tables.
- Storage buckets/policies.
- RLS policies, views, and safe RPC helpers.

## Local migration workflow

1. Install Supabase CLI.
2. Start local stack:
   ```bash
   supabase start
   ```
3. Apply migrations:
   ```bash
   supabase db reset
   ```
   or for incremental apply:
   ```bash
   supabase migration up
   ```

## Production apply workflow

1. **Back up production first** (database backup + point-in-time recovery check).
2. Verify migrations in staging.
3. Apply in production during a maintenance window:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
4. Validate critical tables/columns using `backend/scripts/check-supabase-schema.mjs`.

## Security warnings

- **Service role key must only exist in backend runtime secrets** (never frontend, never client bundles).
- Frontend must use only the public anon key.
- Secrets are never exposed from `integration_credentials` to anon/authenticated users.
- RLS is enabled across public tables to enforce workspace boundaries.
- Storage buckets are private by default.

## Notes

- Migrations are additive and idempotent where feasible (`if not exists`, safe indexes, compatibility preservation).
- `game_build_jobs` is retained as a legacy compatibility table and marked deprecated in schema docs.
- Schema reload notification is emitted at the end of each exposed-schema migration.
