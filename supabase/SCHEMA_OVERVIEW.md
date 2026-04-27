# Schema Overview

## Table groups

1. **Core identity/workspaces**
   - `profiles`, `workspaces`, `workspace_members`, `workspace_invitations`
2. **Billing and usage**
   - `plans`, `subscriptions`, `usage_counters`, `usage_events`, `payment_orders`, `payments`, `transactions`, `billing_events`
3. **Game Factory**
   - `unity_game_projects`, `game_briefs`, `game_generation_jobs`, `unity_build_jobs`, `game_artifacts`, `game_release_jobs`, `game_release_events`
   - `game_build_jobs` (legacy, deprecated compatibility)
4. **Integrations/credentials**
   - `user_integrations`, `integration_credentials`
5. **Ops/security/observability**
   - `background_jobs`, `job_attempts`, `webhook_events`, `audit_logs`, `security_events`, `api_usage_counters`, `rate_limit_events`, `idempotency_keys`

## Ownership model

- Workspace is the primary tenancy boundary.
- Most operational entities are scoped by `workspace_id`.
- Some tables also track `user_id` as actor/owner.
- `workspaces.owner_user_id` + `workspace_members.role` determine elevated ownership/admin permissions.

## RLS model

- RLS enabled for all public application tables.
- Read access generally requires active workspace membership.
- Write access for sensitive entities generally requires workspace owner/admin.
- Billing tables are owner/admin only.
- Credentials, job queue internals, and webhook processing are backend/service role only.
- Audit/security logs are owner/admin readable; inserts come from backend/service role.

## Storage model

- Buckets:
  - `game-artifacts` (private, backend-managed uploads).
  - `user-uploads` (private, user-scoped paths).
- Policies enforce membership/ownership checks for reads and tightly scoped writes.

## Job lifecycle

1. API enqueues `background_jobs` (queued).
2. Worker locks job (`locked_at`, `locked_by`) and increments attempts.
3. Detailed tries are tracked in `job_attempts`.
4. Completion/failure updates status/output/error fields.

## Unity build lifecycle

1. `unity_game_projects` created per workspace.
2. Build request creates `unity_build_jobs` entry (`queued`).
3. Worker updates status/timestamps and Unity identifiers.
4. Build output creates `game_artifacts` with checksum/storage metadata.

## Google Play release lifecycle

1. Release request creates `game_release_jobs` (provider defaults to `google_play`).
2. Release worker updates track/status/provider responses.
3. Operational events are appended to `game_release_events` for timeline visibility.

## Integration credential security model

- `integration_credentials` stores either:
  - `encrypted_payload` (application-managed encryption), or
  - `vault_secret_id` (Supabase Vault pointer).
- Plaintext secrets are prohibited.
- Frontend cannot directly read integration credential records.
- Service role access is restricted to backend-only execution paths.
