-- ==========================================================================
-- Migration: Extend property_sales & property_rentals to align with legacy
--            B01委託物件資料.xlsx → Sheet 1（委託基本資料）
-- Date: 2026-03-04
-- ==========================================================================

BEGIN;

-- ── Helper: add updated_at to both tables (currently missing) ────────────
ALTER TABLE public.property_sales
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.property_rentals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- backfill updated_at for existing rows
UPDATE public.property_sales  SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.property_rentals SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE public.property_sales  ALTER COLUMN updated_at SET NOT NULL, ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.property_rentals ALTER COLUMN updated_at SET NOT NULL, ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER trg_property_sales_updated_at
  BEFORE UPDATE ON public.property_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_property_rentals_updated_at
  BEFORE UPDATE ON public.property_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════════════════════════
-- PROPERTY_SALES  –  new columns
-- ═════════════════════════════════════════════════════════════════════════
ALTER TABLE public.property_sales

  -- ▸ Legacy identification
  ADD COLUMN IF NOT EXISTS legacy_code         TEXT,
  ADD COLUMN IF NOT EXISTS legacy_key_code     TEXT,
  ADD COLUMN IF NOT EXISTS contract_category   TEXT,
  ADD COLUMN IF NOT EXISTS custom_number       TEXT,
  ADD COLUMN IF NOT EXISTS original_listing_code TEXT,

  -- ▸ Branch
  ADD COLUMN IF NOT EXISTS branch_code TEXT,

  -- ▸ Building info
  ADD COLUMN IF NOT EXISTS building_type       TEXT,
  ADD COLUMN IF NOT EXISTS building_purpose    TEXT,
  ADD COLUMN IF NOT EXISTS building_age_years  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS completion_date_raw TEXT,
  ADD COLUMN IF NOT EXISTS orientation         TEXT,
  ADD COLUMN IF NOT EXISTS is_corner_unit      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS construction_company TEXT,
  ADD COLUMN IF NOT EXISTS building_condition  TEXT,

  -- ▸ Area（坪）
  ADD COLUMN IF NOT EXISTS area_registered     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_usable         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_main_building  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_auxiliary      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_land           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_common         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_extension      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_basement       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_shared         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_building       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_parking        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS basement_registration_note TEXT,

  -- ▸ Floor
  ADD COLUMN IF NOT EXISTS floor_min           INTEGER,
  ADD COLUMN IF NOT EXISTS floor_max           INTEGER,
  ADD COLUMN IF NOT EXISTS total_floors        INTEGER,
  ADD COLUMN IF NOT EXISTS basement_floors     INTEGER DEFAULT 0,

  -- ▸ Layout（格局）
  ADD COLUMN IF NOT EXISTS layout_rooms        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_living_rooms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_bathrooms    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_balconies    INTEGER DEFAULT 0,

  -- ▸ Pricing（萬元）
  ADD COLUMN IF NOT EXISTS down_payment            NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_mortgage_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_loan_amount     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price_registered   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit_price_usable       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS agent_price             NUMERIC(12,2),

  -- ▸ Parking
  ADD COLUMN IF NOT EXISTS parking_type           TEXT,
  ADD COLUMN IF NOT EXISTS parking_number         TEXT,
  ADD COLUMN IF NOT EXISTS has_parking            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_includes_parking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_price          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_ownership      TEXT,
  ADD COLUMN IF NOT EXISTS parking_inclusion_note TEXT,

  -- ▸ Location
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS latitude    NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude   NUMERIC(10,7),

  -- ▸ Nearby facilities（快速欄位，詳細資料仍在 nearby_facilities 表）
  ADD COLUMN IF NOT EXISTS nearby_junior_high TEXT,
  ADD COLUMN IF NOT EXISTS nearby_elementary  TEXT,
  ADD COLUMN IF NOT EXISTS nearby_mrt         TEXT,
  ADD COLUMN IF NOT EXISTS nearby_park        TEXT,

  -- ▸ Dates
  ADD COLUMN IF NOT EXISTS contract_expiry_date  DATE,
  ADD COLUMN IF NOT EXISTS commission_date       DATE,
  ADD COLUMN IF NOT EXISTS filing_date           DATE,
  ADD COLUMN IF NOT EXISTS open_date             DATE,
  ADD COLUMN IF NOT EXISTS last_followup_date    DATE,
  ADD COLUMN IF NOT EXISTS last_registration_date DATE,

  -- ▸ Marketing / Media flags
  ADD COLUMN IF NOT EXISTS has_video           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_floor_plan      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_property_photos BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_onsite_exposure  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS youtube_code        TEXT,
  ADD COLUMN IF NOT EXISTS vr_720_url          TEXT,

  -- ▸ Status / Control
  ADD COLUMN IF NOT EXISTS is_data_open       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS main_judgment      TEXT,
  ADD COLUMN IF NOT EXISTS workflow_control   TEXT,

  -- ▸ Rental-specific（跨類型物件可能同時有租售資訊）
  ADD COLUMN IF NOT EXISTS rent_includes_tax      BOOLEAN,
  ADD COLUMN IF NOT EXISTS rental_deposit_months  INTEGER,

  -- ▸ Business area / Community
  ADD COLUMN IF NOT EXISTS business_area_code TEXT,
  ADD COLUMN IF NOT EXISTS business_area_name TEXT,
  ADD COLUMN IF NOT EXISTS community_code     TEXT,
  ADD COLUMN IF NOT EXISTS community_name     TEXT,

  -- ▸ Freeform / Notes
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS confidential_notes TEXT,
  ADD COLUMN IF NOT EXISTS property_source    TEXT,
  ADD COLUMN IF NOT EXISTS data_source        TEXT,
  ADD COLUMN IF NOT EXISTS selling_reason     TEXT,
  ADD COLUMN IF NOT EXISTS advantages         TEXT,
  ADD COLUMN IF NOT EXISTS disadvantages      TEXT,
  ADD COLUMN IF NOT EXISTS is_investigation_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transcript_case_number  TEXT,
  ADD COLUMN IF NOT EXISTS last_modifier           TEXT,
  ADD COLUMN IF NOT EXISTS case_count              INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_rooms             INTEGER DEFAULT 0;


-- ═════════════════════════════════════════════════════════════════════════
-- PROPERTY_RENTALS  –  identical column set
-- ═════════════════════════════════════════════════════════════════════════
ALTER TABLE public.property_rentals

  ADD COLUMN IF NOT EXISTS legacy_code         TEXT,
  ADD COLUMN IF NOT EXISTS legacy_key_code     TEXT,
  ADD COLUMN IF NOT EXISTS contract_category   TEXT,
  ADD COLUMN IF NOT EXISTS custom_number       TEXT,
  ADD COLUMN IF NOT EXISTS original_listing_code TEXT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT,

  ADD COLUMN IF NOT EXISTS building_type       TEXT,
  ADD COLUMN IF NOT EXISTS building_purpose    TEXT,
  ADD COLUMN IF NOT EXISTS building_age_years  NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS completion_date_raw TEXT,
  ADD COLUMN IF NOT EXISTS orientation         TEXT,
  ADD COLUMN IF NOT EXISTS is_corner_unit      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS construction_company TEXT,
  ADD COLUMN IF NOT EXISTS building_condition  TEXT,

  ADD COLUMN IF NOT EXISTS area_registered     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_usable         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_main_building  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_auxiliary      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_land           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_common         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_extension      NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_basement       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_shared         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_building       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_parking        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS basement_registration_note TEXT,

  ADD COLUMN IF NOT EXISTS floor_min           INTEGER,
  ADD COLUMN IF NOT EXISTS floor_max           INTEGER,
  ADD COLUMN IF NOT EXISTS total_floors        INTEGER,
  ADD COLUMN IF NOT EXISTS basement_floors     INTEGER DEFAULT 0,

  ADD COLUMN IF NOT EXISTS layout_rooms        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_living_rooms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_bathrooms    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout_balconies    INTEGER DEFAULT 0,

  ADD COLUMN IF NOT EXISTS down_payment            NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_mortgage_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_loan_amount     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price_registered   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit_price_usable       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS agent_price             NUMERIC(12,2),

  ADD COLUMN IF NOT EXISTS parking_type           TEXT,
  ADD COLUMN IF NOT EXISTS parking_number         TEXT,
  ADD COLUMN IF NOT EXISTS has_parking            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS price_includes_parking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_price          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_ownership      TEXT,
  ADD COLUMN IF NOT EXISTS parking_inclusion_note TEXT,

  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS latitude    NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude   NUMERIC(10,7),

  ADD COLUMN IF NOT EXISTS nearby_junior_high TEXT,
  ADD COLUMN IF NOT EXISTS nearby_elementary  TEXT,
  ADD COLUMN IF NOT EXISTS nearby_mrt         TEXT,
  ADD COLUMN IF NOT EXISTS nearby_park        TEXT,

  ADD COLUMN IF NOT EXISTS contract_expiry_date  DATE,
  ADD COLUMN IF NOT EXISTS commission_date       DATE,
  ADD COLUMN IF NOT EXISTS filing_date           DATE,
  ADD COLUMN IF NOT EXISTS open_date             DATE,
  ADD COLUMN IF NOT EXISTS last_followup_date    DATE,
  ADD COLUMN IF NOT EXISTS last_registration_date DATE,

  ADD COLUMN IF NOT EXISTS has_video           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_floor_plan      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_property_photos BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_onsite_exposure  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS youtube_code        TEXT,
  ADD COLUMN IF NOT EXISTS vr_720_url          TEXT,

  ADD COLUMN IF NOT EXISTS is_data_open       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS main_judgment      TEXT,
  ADD COLUMN IF NOT EXISTS workflow_control   TEXT,

  ADD COLUMN IF NOT EXISTS rent_includes_tax      BOOLEAN,
  ADD COLUMN IF NOT EXISTS rental_deposit_months  INTEGER,

  ADD COLUMN IF NOT EXISTS business_area_code TEXT,
  ADD COLUMN IF NOT EXISTS business_area_name TEXT,
  ADD COLUMN IF NOT EXISTS community_code     TEXT,
  ADD COLUMN IF NOT EXISTS community_name     TEXT,

  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS confidential_notes TEXT,
  ADD COLUMN IF NOT EXISTS property_source    TEXT,
  ADD COLUMN IF NOT EXISTS data_source        TEXT,
  ADD COLUMN IF NOT EXISTS selling_reason     TEXT,
  ADD COLUMN IF NOT EXISTS advantages         TEXT,
  ADD COLUMN IF NOT EXISTS disadvantages      TEXT,
  ADD COLUMN IF NOT EXISTS is_investigation_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transcript_case_number  TEXT,
  ADD COLUMN IF NOT EXISTS last_modifier           TEXT,
  ADD COLUMN IF NOT EXISTS case_count              INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_rooms             INTEGER DEFAULT 0;

-- ── Indexes for commonly queried columns ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prop_sales_legacy_code   ON public.property_sales(legacy_code);
CREATE INDEX IF NOT EXISTS idx_prop_sales_building_type ON public.property_sales(building_type);
CREATE INDEX IF NOT EXISTS idx_prop_sales_orientation   ON public.property_sales(orientation);
CREATE INDEX IF NOT EXISTS idx_prop_sales_community     ON public.property_sales(community_code);
CREATE INDEX IF NOT EXISTS idx_prop_sales_branch        ON public.property_sales(branch_code);
CREATE INDEX IF NOT EXISTS idx_prop_sales_coords        ON public.property_sales(latitude, longitude)
  WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prop_rentals_legacy_code   ON public.property_rentals(legacy_code);
CREATE INDEX IF NOT EXISTS idx_prop_rentals_building_type ON public.property_rentals(building_type);
CREATE INDEX IF NOT EXISTS idx_prop_rentals_orientation   ON public.property_rentals(orientation);
CREATE INDEX IF NOT EXISTS idx_prop_rentals_community     ON public.property_rentals(community_code);
CREATE INDEX IF NOT EXISTS idx_prop_rentals_branch        ON public.property_rentals(branch_code);
CREATE INDEX IF NOT EXISTS idx_prop_rentals_coords        ON public.property_rentals(latitude, longitude)
  WHERE latitude IS NOT NULL;

COMMIT;
