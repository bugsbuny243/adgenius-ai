# Migrations

## 2026-04-02: schema alignment follow-up

Script: `sql/20260402_schema_alignment_followup.sql`

### Purpose
Brings legacy DB schemas in line with current SQLAlchemy models for:
- campaigns
- advertiser_wallets
- impressions
- clicks
- publisher_payouts
- publisher_profiles
- publisher_sites
- placements
- ad_slots
- live_campaigns
- generation_* tables

### Safety pattern
1. **Rename-first** if legacy source column exists and target column does not.
2. **Add-if-missing** for target columns.
3. **Backfill** where legacy source may still coexist.
4. **Idempotent** guards (`IF EXISTS` / `IF NOT EXISTS`) allow re-run.

### Backward compatibility notes
- Existing legacy columns are not dropped in this follow-up patch to keep rollback and dual-read windows safe.
- Application code should read from new canonical names. Legacy names can be removed in a later cleanup migration after production validation.
- New indexes are added for `clicks.click_token` and `ad_slots.slot_key` if absent.

### Execution
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/migrations/sql/20260402_schema_alignment_followup.sql
```

### Post-run verification
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='campaigns'
ORDER BY column_name;
```

## 2026-04-02: full-schema completion pass

Script: `sql/20260402_full_schema_completion.sql`

### Purpose
- Finalize JSONB-backed fields to match Supabase runtime/publisher schema:
  - `publisher_sites.allowed_categories`
  - `placements.context_tags`
  - `ad_slots.allowed_formats`
  - `live_campaigns.target_regions`
  - `live_campaigns.target_formats`
- Enforce enum-backed columns:
  - `ad_slots.format`
  - `live_campaigns.pricing_model`
  - `publisher_profiles.status`
  - `campaigns.status`
- Reconcile `live_campaigns` with runtime budget/moderation/targeting fields and add additive parity columns for `ad_impressions`, `ad_clicks`, `budget_ledgers`, `pacing_counters`, and `delivery_rules`.

### Execution
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/migrations/sql/20260402_full_schema_completion.sql
```

## 2026-04-04: finance invoice alignment

Script: `sql/20260404_finance_invoice_alignment.sql`

### Purpose
Scoped alignment for `advertiser_invoices` only:
- repoints `campaign_id` FK to `live_campaigns(id)`
- enforces uniqueness on `invoice_number`
- sets DB default for `status` to `PENDING`
- canonicalizes legacy lowercase statuses (`pending`, `paid`, `void`) to uppercase

### Execution
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/migrations/sql/20260404_finance_invoice_alignment.sql
```

### Staging smoke-check notes
- **Preflight duplicate check (required):** the partial unique index creation will fail if duplicate non-null `invoice_number` values already exist.
  ```sql
  SELECT invoice_number, COUNT(*)
  FROM public.advertiser_invoices
  WHERE invoice_number IS NOT NULL
  GROUP BY invoice_number
  HAVING COUNT(*) > 1;
  ```
- **Legacy status handling:** only `pending`, `paid`, and `void` (case-insensitive) are canonicalized to uppercase. Other unexpected legacy values are intentionally left unchanged for manual review.
- **Atomicity recommendation:** run in a single transaction during staging apply (for example with `psql -1`) to avoid partial-apply state if a later step fails.
