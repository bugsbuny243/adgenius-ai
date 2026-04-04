-- Align advertiser_invoices DB schema with finance model expectations.

-- 1) Repoint campaign_id FK to live_campaigns(id)
DO $$
DECLARE
    fk_rec record;
BEGIN
    FOR fk_rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid
            AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'public'
          AND t.relname = 'advertiser_invoices'
          AND c.contype = 'f'
          AND a.attname = 'campaign_id'
          AND pg_get_constraintdef(c.oid) NOT ILIKE '%REFERENCES live_campaigns(id)%'
    LOOP
        EXECUTE format('ALTER TABLE public.advertiser_invoices DROP CONSTRAINT IF EXISTS %I', fk_rec.conname);
    END LOOP;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'advertiser_invoices'
          AND c.conname = 'advertiser_invoices_campaign_id_fkey'
    ) THEN
        ALTER TABLE public.advertiser_invoices
            ADD CONSTRAINT advertiser_invoices_campaign_id_fkey
            FOREIGN KEY (campaign_id)
            REFERENCES public.live_campaigns(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

-- 2) Enforce invoice_number uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS ux_advertiser_invoices_invoice_number
    ON public.advertiser_invoices (invoice_number)
    WHERE invoice_number IS NOT NULL;

-- 3) Set DB default status to PENDING
ALTER TABLE public.advertiser_invoices
    ALTER COLUMN status SET DEFAULT 'PENDING';

-- 4) Safe status canonicalization backfill
UPDATE public.advertiser_invoices
SET status = CASE lower(status)
    WHEN 'pending' THEN 'PENDING'
    WHEN 'paid' THEN 'PAID'
    WHEN 'void' THEN 'VOID'
    ELSE status
END
WHERE lower(status) IN ('pending', 'paid', 'void');
