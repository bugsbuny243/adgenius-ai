-- Runtime finalize pass: enum + telemetry + governance/finance parity alignment.
-- Idempotent and additive, with safe renames for legacy runtime column names.

BEGIN;

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public._ag_column_exists(p_table text, p_column text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  AS $f$
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = p_table
        AND column_name = p_column
    );
  $f$;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_campaign_status_enum') THEN
    CREATE TYPE public.live_campaign_status_enum AS ENUM ('PENDING', 'READY', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_job_status_enum') THEN
    CREATE TYPE public.generation_job_status_enum AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF public._ag_column_exists('live_campaigns', 'target_categories') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns ALTER COLUMN target_categories TYPE jsonb USING CASE WHEN target_categories IS NULL THEN NULL ELSE to_jsonb(target_categories) END';
  END IF;

  IF public._ag_column_exists('live_campaigns', 'status') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns ALTER COLUMN status TYPE public.live_campaign_status_enum USING upper(status)::public.live_campaign_status_enum';
  ELSE
    EXECUTE 'ALTER TABLE public.live_campaigns ADD COLUMN status public.live_campaign_status_enum DEFAULT ''PENDING''';
  END IF;

  IF public._ag_column_exists('generation_jobs', 'status') THEN
    EXECUTE 'ALTER TABLE public.generation_jobs ALTER COLUMN status TYPE public.generation_job_status_enum USING upper(status)::public.generation_job_status_enum';
  ELSE
    EXECUTE 'ALTER TABLE public.generation_jobs ADD COLUMN status public.generation_job_status_enum DEFAULT ''QUEUED''';
  END IF;
END $$;

DO $$
BEGIN
  IF public._ag_column_exists('ad_impressions', 'occurred_at') AND NOT public._ag_column_exists('ad_impressions', 'served_at') THEN
    EXECUTE 'ALTER TABLE public.ad_impressions RENAME COLUMN occurred_at TO served_at';
  END IF;

  ALTER TABLE public.ad_impressions
    ADD COLUMN IF NOT EXISTS campaign_id uuid,
    ADD COLUMN IF NOT EXISTS slot_id uuid,
    ADD COLUMN IF NOT EXISTS session_id varchar(255),
    ADD COLUMN IF NOT EXISTS ip_hash varchar(128),
    ADD COLUMN IF NOT EXISTS user_agent_hash varchar(128),
    ADD COLUMN IF NOT EXISTS cost numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS publisher_earnings numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS site_url varchar(1024),
    ADD COLUMN IF NOT EXISTS served_at timestamptz DEFAULT NOW();

  IF public._ag_column_exists('ad_clicks', 'ad_impression_id') AND NOT public._ag_column_exists('ad_clicks', 'impression_id') THEN
    EXECUTE 'ALTER TABLE public.ad_clicks RENAME COLUMN ad_impression_id TO impression_id';
  END IF;

  IF public._ag_column_exists('ad_clicks', 'occurred_at') AND NOT public._ag_column_exists('ad_clicks', 'clicked_at') THEN
    EXECUTE 'ALTER TABLE public.ad_clicks RENAME COLUMN occurred_at TO clicked_at';
  END IF;

  ALTER TABLE public.ad_clicks
    ADD COLUMN IF NOT EXISTS campaign_id uuid,
    ADD COLUMN IF NOT EXISTS slot_id uuid,
    ADD COLUMN IF NOT EXISTS impression_id uuid,
    ADD COLUMN IF NOT EXISTS destination_url varchar(1024),
    ADD COLUMN IF NOT EXISTS ip_hash varchar(128),
    ADD COLUMN IF NOT EXISTS cost numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS publisher_earnings numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS clicked_at timestamptz DEFAULT NOW();
END $$;

DO $$
BEGIN
  ALTER TABLE public.delivery_rules
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.budget_ledgers
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid,
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.pacing_counters
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid,
    ADD COLUMN IF NOT EXISTS spend_amount numeric(14,6) DEFAULT 0;

  ALTER TABLE public.advertiser_invoices
    ADD COLUMN IF NOT EXISTS period_start timestamptz,
    ADD COLUMN IF NOT EXISTS period_end timestamptz,
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.ai_optimization_logs
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS generation_job_id uuid,
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.fraud_signals
    ADD COLUMN IF NOT EXISTS signal_type varchar(50);

  ALTER TABLE public.policy_flags
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.conversion_events
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS ad_click_id uuid,
    ADD COLUMN IF NOT EXISTS ad_impression_id uuid,
    ADD COLUMN IF NOT EXISTS value numeric(14,6),
    ADD COLUMN IF NOT EXISTS currency varchar(10),
    ADD COLUMN IF NOT EXISTS meta jsonb;
END $$;

COMMIT;
