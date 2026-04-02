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
