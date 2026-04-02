-- Follow-up migration for schema-first model alignment.
-- Safe/idempotent: prefers explicit rename; falls back to add+copy when rename source is uncertain.

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
DECLARE
  r record;
BEGIN
  -- campaigns
  IF public._ag_column_exists('campaigns', 'name') AND NOT public._ag_column_exists('campaigns', 'title') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN name TO title';
  END IF;
  IF public._ag_column_exists('campaigns', 'budget_total') AND NOT public._ag_column_exists('campaigns', 'total_budget') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN budget_total TO total_budget';
  END IF;
  IF public._ag_column_exists('campaigns', 'budget_daily') AND NOT public._ag_column_exists('campaigns', 'daily_budget') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN budget_daily TO daily_budget';
  END IF;
  IF public._ag_column_exists('campaigns', 'spent') AND NOT public._ag_column_exists('campaigns', 'spent_amount') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN spent TO spent_amount';
  END IF;
  IF public._ag_column_exists('campaigns', 'bid') AND NOT public._ag_column_exists('campaigns', 'bid_amount') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN bid TO bid_amount';
  END IF;
  IF public._ag_column_exists('campaigns', 'destination_url') AND NOT public._ag_column_exists('campaigns', 'landing_url') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN destination_url TO landing_url';
  END IF;
  IF public._ag_column_exists('campaigns', 'start_date') AND NOT public._ag_column_exists('campaigns', 'start_at') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN start_date TO start_at';
  END IF;
  IF public._ag_column_exists('campaigns', 'end_date') AND NOT public._ag_column_exists('campaigns', 'end_at') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN end_date TO end_at';
  END IF;
  IF public._ag_column_exists('campaigns', 'impressions') AND NOT public._ag_column_exists('campaigns', 'impressions_count') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN impressions TO impressions_count';
  END IF;
  IF public._ag_column_exists('campaigns', 'clicks') AND NOT public._ag_column_exists('campaigns', 'clicks_count') THEN
    EXECUTE 'ALTER TABLE public.campaigns RENAME COLUMN clicks TO clicks_count';
  END IF;

  ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS title varchar(255),
    ADD COLUMN IF NOT EXISTS total_budget numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_budget numeric(14,6),
    ADD COLUMN IF NOT EXISTS spent_amount numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bid_amount numeric(14,6) DEFAULT 0.01,
    ADD COLUMN IF NOT EXISTS landing_url varchar(1024) DEFAULT 'https://example.com',
    ADD COLUMN IF NOT EXISTS start_at timestamptz,
    ADD COLUMN IF NOT EXISTS end_at timestamptz,
    ADD COLUMN IF NOT EXISTS impressions_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS clicks_count integer DEFAULT 0;

  IF public._ag_column_exists('campaigns', 'name') THEN
    EXECUTE 'UPDATE public.campaigns SET title = COALESCE(title, name)';
  END IF;

  -- advertiser_wallets
  IF public._ag_column_exists('advertiser_wallets', 'deposited_total') AND NOT public._ag_column_exists('advertiser_wallets', 'total_deposited') THEN
    EXECUTE 'ALTER TABLE public.advertiser_wallets RENAME COLUMN deposited_total TO total_deposited';
  END IF;
  IF public._ag_column_exists('advertiser_wallets', 'spent_total') AND NOT public._ag_column_exists('advertiser_wallets', 'total_spent') THEN
    EXECUTE 'ALTER TABLE public.advertiser_wallets RENAME COLUMN spent_total TO total_spent';
  END IF;
  ALTER TABLE public.advertiser_wallets
    ADD COLUMN IF NOT EXISTS total_deposited numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_spent numeric(14,6) DEFAULT 0;

  IF public._ag_column_exists('advertiser_wallets', 'deposited_total') THEN
    EXECUTE 'UPDATE public.advertiser_wallets SET total_deposited = COALESCE(total_deposited, deposited_total, 0)';
  END IF;
  IF public._ag_column_exists('advertiser_wallets', 'spent_total') THEN
    EXECUTE 'UPDATE public.advertiser_wallets SET total_spent = COALESCE(total_spent, spent_total, 0)';
  END IF;

  -- impressions
  IF public._ag_column_exists('impressions', 'publisher_revenue') AND NOT public._ag_column_exists('impressions', 'publisher_earnings') THEN
    EXECUTE 'ALTER TABLE public.impressions RENAME COLUMN publisher_revenue TO publisher_earnings';
  END IF;
  IF public._ag_column_exists('impressions', 'occurred_at') AND NOT public._ag_column_exists('impressions', 'served_at') THEN
    EXECUTE 'ALTER TABLE public.impressions RENAME COLUMN occurred_at TO served_at';
  END IF;
  ALTER TABLE public.impressions
    ADD COLUMN IF NOT EXISTS publisher_earnings numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS served_at timestamptz DEFAULT NOW();

  -- clicks
  IF public._ag_column_exists('clicks', 'token') AND NOT public._ag_column_exists('clicks', 'click_token') THEN
    EXECUTE 'ALTER TABLE public.clicks RENAME COLUMN token TO click_token';
  END IF;
  IF public._ag_column_exists('clicks', 'target_url') AND NOT public._ag_column_exists('clicks', 'destination_url') THEN
    EXECUTE 'ALTER TABLE public.clicks RENAME COLUMN target_url TO destination_url';
  END IF;
  IF public._ag_column_exists('clicks', 'publisher_revenue') AND NOT public._ag_column_exists('clicks', 'publisher_earnings') THEN
    EXECUTE 'ALTER TABLE public.clicks RENAME COLUMN publisher_revenue TO publisher_earnings';
  END IF;
  IF public._ag_column_exists('clicks', 'occurred_at') AND NOT public._ag_column_exists('clicks', 'clicked_at') THEN
    EXECUTE 'ALTER TABLE public.clicks RENAME COLUMN occurred_at TO clicked_at';
  END IF;
  ALTER TABLE public.clicks
    ADD COLUMN IF NOT EXISTS click_token varchar(1024),
    ADD COLUMN IF NOT EXISTS destination_url varchar(1024),
    ADD COLUMN IF NOT EXISTS publisher_earnings numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS clicked_at timestamptz DEFAULT NOW();

  -- publisher_payouts
  IF public._ag_column_exists('publisher_payouts', 'gross_amount') AND NOT public._ag_column_exists('publisher_payouts', 'gross_earnings') THEN
    EXECUTE 'ALTER TABLE public.publisher_payouts RENAME COLUMN gross_amount TO gross_earnings';
  END IF;
  IF public._ag_column_exists('publisher_payouts', 'platform_fee') AND NOT public._ag_column_exists('publisher_payouts', 'platform_share') THEN
    EXECUTE 'ALTER TABLE public.publisher_payouts RENAME COLUMN platform_fee TO platform_share';
  END IF;
  IF public._ag_column_exists('publisher_payouts', 'publisher_amount') AND NOT public._ag_column_exists('publisher_payouts', 'publisher_share') THEN
    EXECUTE 'ALTER TABLE public.publisher_payouts RENAME COLUMN publisher_amount TO publisher_share';
  END IF;
  IF public._ag_column_exists('publisher_payouts', 'impressions') AND NOT public._ag_column_exists('publisher_payouts', 'impressions_count') THEN
    EXECUTE 'ALTER TABLE public.publisher_payouts RENAME COLUMN impressions TO impressions_count';
  END IF;
  IF public._ag_column_exists('publisher_payouts', 'clicks') AND NOT public._ag_column_exists('publisher_payouts', 'clicks_count') THEN
    EXECUTE 'ALTER TABLE public.publisher_payouts RENAME COLUMN clicks TO clicks_count';
  END IF;
  ALTER TABLE public.publisher_payouts
    ADD COLUMN IF NOT EXISTS gross_earnings numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS platform_share numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS publisher_share numeric(14,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS impressions_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS clicks_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS period_start timestamptz,
    ADD COLUMN IF NOT EXISTS period_end timestamptz;

  -- publisher_profiles
  IF public._ag_column_exists('publisher_profiles', 'revenue_share_percent') AND NOT public._ag_column_exists('publisher_profiles', 'revenue_share_pct') THEN
    EXECUTE 'ALTER TABLE public.publisher_profiles RENAME COLUMN revenue_share_percent TO revenue_share_pct';
  END IF;
  ALTER TABLE public.publisher_profiles
    ADD COLUMN IF NOT EXISTS website_url varchar(255),
    ADD COLUMN IF NOT EXISTS contact_email varchar(255),
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS revenue_share_pct numeric(5,2) DEFAULT 70.00;

  -- publisher_sites
  IF public._ag_column_exists('publisher_sites', 'verified') AND NOT public._ag_column_exists('publisher_sites', 'is_verified') THEN
    EXECUTE 'ALTER TABLE public.publisher_sites RENAME COLUMN verified TO is_verified';
  END IF;
  IF public._ag_column_exists('publisher_sites', 'active') AND NOT public._ag_column_exists('publisher_sites', 'is_active') THEN
    EXECUTE 'ALTER TABLE public.publisher_sites RENAME COLUMN active TO is_active';
  END IF;
  ALTER TABLE public.publisher_sites
    ADD COLUMN IF NOT EXISTS name varchar(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS category varchar(100),
    ADD COLUMN IF NOT EXISTS allowed_categories varchar[] NULL,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

  -- placements
  IF public._ag_column_exists('placements', 'path') AND NOT public._ag_column_exists('placements', 'page_path') THEN
    EXECUTE 'ALTER TABLE public.placements RENAME COLUMN path TO page_path';
  END IF;
  IF public._ag_column_exists('placements', 'tags') AND NOT public._ag_column_exists('placements', 'context_tags') THEN
    EXECUTE 'ALTER TABLE public.placements RENAME COLUMN tags TO context_tags';
  END IF;
  IF public._ag_column_exists('placements', 'active') AND NOT public._ag_column_exists('placements', 'is_active') THEN
    EXECUTE 'ALTER TABLE public.placements RENAME COLUMN active TO is_active';
  END IF;
  ALTER TABLE public.placements
    ADD COLUMN IF NOT EXISTS site_id uuid,
    ADD COLUMN IF NOT EXISTS app_id uuid,
    ADD COLUMN IF NOT EXISTS page_path varchar(1024),
    ADD COLUMN IF NOT EXISTS context_tags varchar[] NULL,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

  -- ad_slots
  IF public._ag_column_exists('ad_slots', 'key') AND NOT public._ag_column_exists('ad_slots', 'slot_key') THEN
    EXECUTE 'ALTER TABLE public.ad_slots RENAME COLUMN key TO slot_key';
  END IF;
  IF public._ag_column_exists('ad_slots', 'type') AND NOT public._ag_column_exists('ad_slots', 'format') THEN
    EXECUTE 'ALTER TABLE public.ad_slots RENAME COLUMN type TO format';
  END IF;
  IF public._ag_column_exists('ad_slots', 'revenue_share_pct') AND NOT public._ag_column_exists('ad_slots', 'revenue_share_percent') THEN
    EXECUTE 'ALTER TABLE public.ad_slots RENAME COLUMN revenue_share_pct TO revenue_share_percent';
  END IF;
  IF public._ag_column_exists('ad_slots', 'active') AND NOT public._ag_column_exists('ad_slots', 'is_active') THEN
    EXECUTE 'ALTER TABLE public.ad_slots RENAME COLUMN active TO is_active';
  END IF;
  ALTER TABLE public.ad_slots
    ADD COLUMN IF NOT EXISTS name varchar(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS slot_key varchar(255),
    ADD COLUMN IF NOT EXISTS format varchar(50) DEFAULT 'BANNER',
    ADD COLUMN IF NOT EXISTS category varchar(100),
    ADD COLUMN IF NOT EXISTS allowed_formats varchar[] NULL,
    ADD COLUMN IF NOT EXISTS width integer,
    ADD COLUMN IF NOT EXISTS height integer,
    ADD COLUMN IF NOT EXISTS revenue_share_percent numeric(5,2) DEFAULT 70.00,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

  -- live_campaigns
  IF public._ag_column_exists('live_campaigns', 'regions') AND NOT public._ag_column_exists('live_campaigns', 'target_regions') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN regions TO target_regions';
  END IF;
  IF public._ag_column_exists('live_campaigns', 'formats') AND NOT public._ag_column_exists('live_campaigns', 'target_formats') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN formats TO target_formats';
  END IF;
  IF public._ag_column_exists('live_campaigns', 'daily_cap') AND NOT public._ag_column_exists('live_campaigns', 'daily_budget_cap') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN daily_cap TO daily_budget_cap';
  END IF;
  IF public._ag_column_exists('live_campaigns', 'status') AND NOT public._ag_column_exists('live_campaigns', 'approval_status') THEN
    EXECUTE 'ALTER TABLE public.live_campaigns RENAME COLUMN status TO approval_status';
  END IF;
  ALTER TABLE public.live_campaigns
    ADD COLUMN IF NOT EXISTS pricing_model varchar(20) DEFAULT 'CPC',
    ADD COLUMN IF NOT EXISTS cpm_rate numeric(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cpc_rate numeric(10,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS target_regions varchar[] NULL,
    ADD COLUMN IF NOT EXISTS target_formats varchar[] NULL,
    ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_budget_cap numeric(12,4),
    ADD COLUMN IF NOT EXISTS approval_status varchar(50) DEFAULT 'pending';

  -- generation tables
  IF public._ag_column_exists('generation_jobs', 'model') AND NOT public._ag_column_exists('generation_jobs', 'model_name') THEN
    EXECUTE 'ALTER TABLE public.generation_jobs RENAME COLUMN model TO model_name';
  END IF;
  IF public._ag_column_exists('generation_jobs', 'error') AND NOT public._ag_column_exists('generation_jobs', 'error_message') THEN
    EXECUTE 'ALTER TABLE public.generation_jobs RENAME COLUMN error TO error_message';
  END IF;
  ALTER TABLE public.generation_jobs
    ADD COLUMN IF NOT EXISTS prompt varchar(2000),
    ADD COLUMN IF NOT EXISTS model_name varchar(100),
    ADD COLUMN IF NOT EXISTS error_message varchar(1000);

  ALTER TABLE public.generated_ad_sets
    ADD COLUMN IF NOT EXISTS audience varchar(255);

  IF public._ag_column_exists('generated_ad_variants', 'action_text') AND NOT public._ag_column_exists('generated_ad_variants', 'cta') THEN
    EXECUTE 'ALTER TABLE public.generated_ad_variants RENAME COLUMN action_text TO cta';
  END IF;
  IF public._ag_column_exists('generated_ad_variants', 'url') AND NOT public._ag_column_exists('generated_ad_variants', 'landing_url') THEN
    EXECUTE 'ALTER TABLE public.generated_ad_variants RENAME COLUMN url TO landing_url';
  END IF;
  IF public._ag_column_exists('generated_ad_variants', 'metadata') AND NOT public._ag_column_exists('generated_ad_variants', 'meta') THEN
    EXECUTE 'ALTER TABLE public.generated_ad_variants RENAME COLUMN metadata TO meta';
  END IF;
  ALTER TABLE public.generated_ad_variants
    ADD COLUMN IF NOT EXISTS cta varchar(255),
    ADD COLUMN IF NOT EXISTS landing_url varchar(1024),
    ADD COLUMN IF NOT EXISTS meta jsonb;

  IF public._ag_column_exists('export_bundles', 'link') AND NOT public._ag_column_exists('export_bundles', 'url') THEN
    EXECUTE 'ALTER TABLE public.export_bundles RENAME COLUMN link TO url';
  END IF;
  IF public._ag_column_exists('export_bundles', 'rev') AND NOT public._ag_column_exists('export_bundles', 'version') THEN
    EXECUTE 'ALTER TABLE public.export_bundles RENAME COLUMN rev TO version';
  END IF;
  ALTER TABLE public.export_bundles
    ADD COLUMN IF NOT EXISTS url varchar(500) DEFAULT '',
    ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

  -- optional indexes for freshly added columns.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_clicks_click_token'
  ) THEN
    EXECUTE 'CREATE INDEX ix_clicks_click_token ON public.clicks (click_token)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_ad_slots_slot_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ix_ad_slots_slot_key ON public.ad_slots (slot_key)';
  END IF;
END $$;

COMMIT;
