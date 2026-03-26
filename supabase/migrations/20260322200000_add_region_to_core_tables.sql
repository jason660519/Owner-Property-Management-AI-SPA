-- =============================================================================
-- Migration: Add region + currency to core tables
-- Date: 2026-03-22
-- Purpose: Enable multi-market support (TW / AU). All existing rows default
--          to TW so no data is lost.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. users_profile
-- ---------------------------------------------------------------------------
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS region   TEXT NOT NULL DEFAULT 'TW'
    CHECK (region IN ('TW', 'AU')),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TWD'
    CHECK (currency IN ('TWD', 'AUD'));

COMMENT ON COLUMN public.users_profile.region   IS 'Market region: TW = Taiwan, AU = Australia';
COMMENT ON COLUMN public.users_profile.currency IS 'Preferred currency tied to region';

CREATE INDEX IF NOT EXISTS idx_users_profile_region ON public.users_profile(region);

-- ---------------------------------------------------------------------------
-- 2. property_sales
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_sales
  ADD COLUMN IF NOT EXISTS region   TEXT NOT NULL DEFAULT 'TW'
    CHECK (region IN ('TW', 'AU')),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TWD'
    CHECK (currency IN ('TWD', 'AUD'));

COMMENT ON COLUMN public.property_sales.region   IS 'Market region for this property listing';
COMMENT ON COLUMN public.property_sales.currency IS 'Currency for price fields';

CREATE INDEX IF NOT EXISTS idx_property_sales_region   ON public.property_sales(region);

-- ---------------------------------------------------------------------------
-- 3. property_rentals
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_rentals
  ADD COLUMN IF NOT EXISTS region   TEXT NOT NULL DEFAULT 'TW'
    CHECK (region IN ('TW', 'AU')),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TWD'
    CHECK (currency IN ('TWD', 'AUD'));

COMMENT ON COLUMN public.property_rentals.region   IS 'Market region for this rental listing';
COMMENT ON COLUMN public.property_rentals.currency IS 'Currency for monthly_rent and other price fields';

CREATE INDEX IF NOT EXISTS idx_property_rentals_region ON public.property_rentals(region);

-- ---------------------------------------------------------------------------
-- 4. Backfill: all existing rows are TW/TWD (already the default, but explicit)
-- ---------------------------------------------------------------------------
UPDATE public.users_profile   SET region = 'TW', currency = 'TWD' WHERE region IS NULL;
UPDATE public.property_sales  SET region = 'TW', currency = 'TWD' WHERE region IS NULL;
UPDATE public.property_rentals SET region = 'TW', currency = 'TWD' WHERE region IS NULL;

COMMIT;
