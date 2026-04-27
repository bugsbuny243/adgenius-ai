# Schema Overview

## Compatibility-first model

This repo uses additive compatibility migrations for existing production schemas.

### Credential split
- `user_integrations.encrypted_credentials` remains for legacy compatibility and is deprecated.
- New credential payloads live in `integration_credentials` (backend/service-role only).
- Frontend reads metadata via `user_integrations_public` view.

### Unity artifact linkage
- `game_artifacts.build_job_id` is legacy compatibility.
- `game_artifacts.unity_build_job_id` is canonical for Unity build artifacts.
- Unity artifact upserts should conflict on `(unity_build_job_id, artifact_type)`.

### Project split
- `unity_game_projects` remains Unity extension.
- Release track / Play integration / version fields are resolved from `game_projects` via `unity_game_projects.project_id`.
