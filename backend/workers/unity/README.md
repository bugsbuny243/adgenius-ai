# Unity Worker Contract

This folder defines the contract for Unity Bridge worker integration.

## Scope boundaries

- Unity must **not** run inside Next.js.
- Unity execution is handled by this worker service, separate from the web runtime.
- Google Play publishing is managed by the release workflow integration layer.

## Runtime location

The Unity worker must run outside the Next.js app process (separate service/container/VM).

## Worker prerequisites

The worker environment must include:

- Unity Editor (compatible version for target templates)
- Android Build Support module
- Java JDK
- Android SDK
- Android NDK

## Polling and claiming jobs

The worker will:

1. Poll `public.unity_build_jobs` for rows where `status = 'queued'`.
2. Claim a job by updating status to `claimed` and setting a stable `worker_id`.
3. Transition to `running` when Unity batch build starts.

## Build execution model

- Worker executes Unity in batch mode for deterministic CI-style builds.
- Build target is currently Android only.
- Build type supports `development` and `release`.

## Artifact handling (future)

- Worker upload süreçlerinde APK/AAB artifact üretimi desteklenir.
- Artifact alanları üretim çıktısına göre doldurulur; sonuç yoksa alanlar boş kalabilir.

## Job status and logs

Worker must update `public.unity_build_jobs` as the source of truth:

- `status`
- `started_at`
- `finished_at`
- `build_logs`
- `error_message`
- `artifact_type` and `artifact_url` (when available)

## Security requirements

- Never store user passwords.
- Keep credentials in environment-level secrets only.
- Use least-privilege database access where possible.

## Release safety

Production/release builds require:

- explicit signing strategy
- approval gate before distributable output is finalized
