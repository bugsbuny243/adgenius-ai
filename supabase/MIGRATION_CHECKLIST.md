# Migration Checklist (Manual)

- [ ] Apply compatibility patch migration: `20260428001000_existing_schema_compatibility_patch.sql`.
- [ ] Apply RLS hardening migration: `20260428001100_drop_old_broad_rls_policies.sql`.
- [ ] Confirm columns exist:
  - `game_artifacts.unity_game_project_id`
  - `game_artifacts.unity_build_job_id`
  - `game_artifacts.workspace_id`
  - `unity_build_jobs.unity_build_number`
  - `unity_build_jobs.external_build_id`
  - `user_integrations.workspace_id`
  - `integration_credentials.encrypted_payload`
- [ ] Confirm `user_integrations_public` view exists.
- [ ] Confirm old broad policies are dropped by exact names.
- [ ] Confirm credentials are written to `integration_credentials`, not frontend-readable columns.
- [ ] Run: `node backend/scripts/check-supabase-schema.mjs`.
