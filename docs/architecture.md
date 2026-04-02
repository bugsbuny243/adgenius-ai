# AdGenius Next-Generation Architecture Foundation

## Monorepo structure

- `apps/web`: Next.js + TypeScript advertiser/publisher/admin/login surfaces.
- `services/api-gateway`: Public BFF + REST API under `/api/v1`.
- `services/serving`: Hot-path ad serve + click/impression tracking ingress.
- `services/worker`: Async consumers for tracking, generation jobs, payouts, analytics sink.
- `services/ai`: Gemini-focused abstraction for brief processing, prompt building, orchestration.
- `internal/shared`: Shared config/logging/http/messaging/db utility packages.
- `infra/docker`: Local-first compose stack.

## Domain ownership split

- **Campaign authoring:** campaigns, ads.
- **Runtime publish:** live_campaigns.
- **Supply/inventory:** publisher_profiles, sites/apps, placements, ad_slots.
- **Serving envelope:** ad_requests.
- **Tracking:** impressions/clicks (campaign-level), ad_impressions/ad_clicks (runtime detail).
- **Finance:** advertiser_wallets, transactions, budget_ledgers, publisher_earnings, payouts, invoices.
- **AI generation:** campaign_briefs, generation_jobs, generated_ad_sets/variants, export_bundles.
- **Governance/Ops:** fraud_signals, policy_flags, moderation_reviews, optimization_logs, usage_logs.

## Event subject naming (NATS JetStream)

- `tracking.ad_request.created`
- `tracking.impression.recorded`
- `tracking.click.recorded`
- `generation.job.created`
- `generation.job.completed`
- `finance.payout.requested`
- `finance.payout.settled`

## Database ownership

- **PostgreSQL:** transactional state + money movement state.
- **ClickHouse:** high-volume event analytics and reporting rollups.
- **Redis:** frequency cap, counters, short-lived serving controls.

## Legacy code note

Legacy FastAPI/Celery implementation remains in `apps/api` and `apps/worker` (Python) for backwards compatibility during migration. New architecture is isolated under `services/*`.
