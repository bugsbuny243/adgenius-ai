# Unity Worker Contract (Foundation)

This folder defines the contract for the first Unity Bridge worker integration.

## Non-goals for this phase

- Unity must **not** run inside Next.js.
- This foundation does **not** implement real Unity execution yet.
- This foundation does **not** implement Google Play upload yet.

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

- Worker will upload APK/AAB artifacts in a later phase.
- For this foundation, artifact fields can remain empty or mock-populated.

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
