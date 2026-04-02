-- Full-schema completion pass: JSONB/Enum/live runtime alignment with Supabase schema.
-- Safe/idempotent and additive; includes compatibility backfills for prior runtime field names.

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
  -- enum scaffolding
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_format_enum') THEN
    CREATE TYPE public.slot_format_enum AS ENUM ('BANNER', 'NATIVE', 'VIDEO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_model_enum') THEN
    CREATE TYPE public.pricing_model_enum AS ENUM ('CPC', 'CPM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publisher_status_enum') THEN
    CREATE TYPE public.publisher_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status_enum') THEN
    CREATE TYPE public.campaign_status_enum AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'ENDED');
  END IF;
END $$;

DO $$
BEGIN
  -- JSONB-backed publisher family
  IF public._ag_column_exists('publisher_sites', 'allowed_categories') THEN
    EXECUTE 'ALTER TABLE public.publisher_sites ALTER COLUMN allowed_categories TYPE jsonb USING CASE WHEN allowed_categories IS NULL THEN NULL ELSE to_jsonb(allowed_categories) END';
  END IF;

  IF public._ag_column_exists('placements', 'context_tags') THEN
    EXECUTE 'ALTER TABLE public.placements ALTER COLUMN context_tags TYPE jsonb USING CASE WHEN context_tags IS NULL THEN NULL ELSE to_jsonb(context_tags) END';
  END IF;

  IF public._ag_column_exists('ad_slots', 'allowed_formats') THEN
    EXECUTE 'ALTER TABLE public.ad_slots ALTER COLUMN allowed_formats TYPE jsonb USING CASE WHEN allowed_formats IS NULL THEN NULL ELSE to_jsonb(allowed_formats) END';
  END IF;

  -- runtime JSONB fields
  IF public._ag_column_exists('live_campaigns', 'target_regions') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns ALTER COLUMN target_regions TYPE jsonb USING CASE WHEN target_regions IS NULL THEN NULL ELSE to_jsonb(target_regions) END';
  END IF;
  IF public._ag_column_exists('live_campaigns', 'target_formats') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns ALTER COLUMN target_formats TYPE jsonb USING CASE WHEN target_formats IS NULL THEN NULL ELSE to_jsonb(target_formats) END';
  END IF;
END $$;

DO $$
BEGIN
  -- enum-backed fields
  IF public._ag_column_exists('ad_slots', 'format') THEN
    EXECUTE 'ALTER TABLE public.ad_slots ALTER COLUMN format TYPE public.slot_format_enum USING upper(format)::public.slot_format_enum';
  END IF;

  IF public._ag_column_exists('live_campaigns', 'pricing_model') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns ALTER COLUMN pricing_model TYPE public.pricing_model_enum USING upper(pricing_model)::public.pricing_model_enum';
  ELSE
    EXECUTE 'ALTER TABLE public.live_campaigns ADD COLUMN pricing_model public.pricing_model_enum DEFAULT ''CPC''';
  END IF;

  IF public._ag_column_exists('publisher_profiles', 'status') THEN
    EXECUTE 'ALTER TABLE public.publisher_profiles ALTER COLUMN status TYPE public.publisher_status_enum USING upper(status)::public.publisher_status_enum';
  END IF;

  IF public._ag_column_exists('campaigns', 'status') THEN
    EXECUTE 'ALTER TABLE public.campaigns ALTER COLUMN status TYPE public.campaign_status_enum USING upper(status)::public.campaign_status_enum';
  END IF;
END $$;

DO $$
BEGIN
  -- live_campaigns reconciliation with schema source-of-truth columns
  ALTER TABLE public.live_campaigns
    ADD COLUMN IF NOT EXISTS workspace_id uuid,
    ADD COLUMN IF NOT EXISTS campaign_brief_id uuid,
    ADD COLUMN IF NOT EXISTS name varchar(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS cpm_rate numeric(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cpc_rate numeric(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_budget numeric(14,6),
    ADD COLUMN IF NOT EXISTS spent_amount numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_budget_cap numeric(12,4),
    ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS target_categories jsonb,
    ADD COLUMN IF NOT EXISTS target_regions jsonb,
    ADD COLUMN IF NOT EXISTS target_formats jsonb,
    ADD COLUMN IF NOT EXISTS frequency_cap_per_session integer,
    ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS start_date timestamptz,
    ADD COLUMN IF NOT EXISTS end_date timestamptz;

  IF public._ag_column_exists('live_campaigns', 'frequency_cap_per_user') AND NOT public._ag_column_exists('live_campaigns', 'frequency_cap_per_session') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN frequency_cap_per_user TO frequency_cap_per_session';
  END IF;

  IF public._ag_column_exists('live_campaigns', 'total_budget_cap') AND NOT public._ag_column_exists('live_campaigns', 'total_budget') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN total_budget_cap TO total_budget';
  END IF;

  IF public._ag_column_exists('live_campaigns', 'approval_status') THEN
    UPDATE public.live_campaigns
    SET
      is_approved = COALESCE(is_approved, false) OR upper(approval_status) = 'APPROVED',
      approved_at = CASE WHEN approved_at IS NULL AND upper(approval_status) = 'APPROVED' THEN NOW() ELSE approved_at END,
      rejection_reason = CASE WHEN rejection_reason IS NULL AND upper(approval_status) = 'REJECTED' THEN 'Rejected during moderation' ELSE rejection_reason END;
  END IF;
END $$;

DO $$
BEGIN
  -- runtime telemetry tables (additive reconciliation)
  ALTER TABLE public.ad_impressions
    ADD COLUMN IF NOT EXISTS campaign_id uuid,
    ADD COLUMN IF NOT EXISTS slot_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid;

  ALTER TABLE public.ad_clicks
    ADD COLUMN IF NOT EXISTS campaign_id uuid,
    ADD COLUMN IF NOT EXISTS slot_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid;

  -- finance/runtime control tables (additive reconciliation)
  ALTER TABLE public.budget_ledgers
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid,
    ADD COLUMN IF NOT EXISTS meta jsonb;

  ALTER TABLE public.pacing_counters
    ADD COLUMN IF NOT EXISTS live_campaign_id uuid,
    ADD COLUMN IF NOT EXISTS workspace_id uuid,
    ADD COLUMN IF NOT EXISTS spend_amount numeric(14,6) DEFAULT 0;

  ALTER TABLE public.delivery_rules
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS meta jsonb;
END $$;

COMMIT;
