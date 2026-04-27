# Migration Checklist (Manual)

- [ ] Confirm production backup exists before apply.
- [ ] Run migrations in staging and verify no destructive diffs.
- [ ] Confirm required tables exist (`workspaces`, `workspace_members`, `profiles`, `unity_game_projects`, `unity_build_jobs`, `game_artifacts`, `game_release_jobs`, `user_integrations`).
- [ ] Confirm required columns exist (`game_artifacts.unity_game_project_id`, `game_artifacts.file_url`).
- [ ] Confirm RLS enabled for all public app tables.
- [ ] Validate authenticated user can only read their workspace rows.
- [ ] Validate non-owner cannot mutate owner/admin-restricted tables.
- [ ] Validate integration credential table is not readable by anon/authenticated.
- [ ] Validate storage buckets are private and policies match workspace/user path rules.
- [ ] Validate views and RPCs return only authorized data.
- [ ] Validate background job/webhook/audit tables are service-role write paths.
- [ ] Run `backend/scripts/check-supabase-schema.mjs` against target DB.
