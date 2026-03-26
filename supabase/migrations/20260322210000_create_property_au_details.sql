-- =============================================================================
-- Migration: Create property_au_details extension table
-- Date: 2026-03-22
-- Purpose: Store AU-specific property fields without polluting the main TW
--          tables. Joined when region = 'AU'. All columns are nullable so
--          partial data can be saved progressively.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_au_details (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logical FK: references property_sales.id OR property_rentals.id
  property_id   UUID    NOT NULL,
  property_type TEXT    NOT NULL CHECK (property_type IN ('sales', 'rentals')),

  -- ── AU Address (completely different from TW city/district/street format) ──
  au_street_number TEXT,
  au_street_name   TEXT,
  au_suburb        TEXT,
  au_state         TEXT CHECK (au_state IN ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT')),
  au_postcode      TEXT,

  -- ── Area in sqm (not 坪/ping) ──────────────────────────────────────────────
  au_area_land_sqm     NUMERIC(10,2),  -- land/block size
  au_area_internal_sqm NUMERIC(10,2),  -- internal floor area
  au_area_external_sqm NUMERIC(10,2),  -- garage, balcony, courtyard
  au_area_garage_sqm   NUMERIC(10,2),

  -- ── Legal / Title (AU system, not 謄本/地號) ─────────────────────────────
  au_lot_number           TEXT,  -- e.g. "Lot 42"
  au_dp_number            TEXT,  -- Deposited Plan, e.g. "DP123456"
  au_certificate_of_title TEXT,  -- e.g. "Folio 1/123456"
  au_council_zone         TEXT,  -- e.g. "R2 Low Density Residential"
  au_council_area         TEXT,  -- local government area

  -- ── Nearby amenities (AU version, replaces 捷運/國中/國小) ────────────────
  au_nearby_train_station     TEXT,
  au_nearby_bus_stop          TEXT,
  au_nearby_tram_stop         TEXT,   -- VIC / SA
  au_nearby_ferry_wharf       TEXT,   -- NSW / QLD
  au_nearby_primary_school    TEXT,
  au_nearby_high_school       TEXT,
  au_nearby_shopping_centre   TEXT,
  au_nearby_beach             TEXT,
  au_nearby_hospital          TEXT,

  -- ── Rental-specific (AU bond system) ──────────────────────────────────────
  -- Bond is lodged with state authority, not held by landlord
  au_bond_weeks           INTEGER DEFAULT 4
    CHECK (au_bond_weeks BETWEEN 1 AND 6),
  au_pet_bond_allowed     BOOLEAN DEFAULT FALSE,
  au_pet_negotiable       BOOLEAN DEFAULT FALSE,
  au_available_date       DATE,           -- when the property is available
  au_lease_term_months    INTEGER,        -- 0 = periodic/month-to-month

  -- ── Strata / Body Corporate (no TW equivalent) ────────────────────────────
  au_is_strata              BOOLEAN DEFAULT FALSE,
  au_strata_plan_number     TEXT,         -- e.g. "SP12345"
  au_strata_levy_quarterly  NUMERIC(10,2),
  au_building_manager_name  TEXT,
  au_building_manager_phone TEXT,

  -- ── Ongoing costs (commonly disclosed in AU listings) ─────────────────────
  au_council_rates_annual   NUMERIC(10,2),
  au_water_rates_annual     NUMERIC(10,2),
  au_land_tax_annual        NUMERIC(10,2),

  -- ── Sale-specific ──────────────────────────────────────────────────────────
  au_sale_type              TEXT CHECK (au_sale_type IN ('private_treaty', 'auction', 'expressions_of_interest')),
  au_auction_date           TIMESTAMPTZ,
  au_auction_venue          TEXT,
  au_price_guide            TEXT,        -- AU agents often show a price guide instead of fixed price
  au_vendor_statement_ready BOOLEAN DEFAULT FALSE,  -- Section 32 / Form 1

  -- ── Building inspection / due diligence ───────────────────────────────────
  au_building_inspection_available  BOOLEAN DEFAULT FALSE,
  au_pest_inspection_available      BOOLEAN DEFAULT FALSE,
  au_strata_inspection_available    BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One AU-details row per property
  UNIQUE (property_id, property_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prop_au_details_property  ON public.property_au_details(property_id, property_type);
CREATE INDEX IF NOT EXISTS idx_prop_au_details_state     ON public.property_au_details(au_state);
CREATE INDEX IF NOT EXISTS idx_prop_au_details_suburb    ON public.property_au_details(au_suburb);
CREATE INDEX IF NOT EXISTS idx_prop_au_details_postcode  ON public.property_au_details(au_postcode);

-- updated_at trigger
CREATE TRIGGER trg_property_au_details_updated_at
  BEFORE UPDATE ON public.property_au_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.property_au_details ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own AU details (join through property table)
CREATE POLICY "property_au_details: owner can manage via property"
  ON public.property_au_details
  FOR ALL
  USING (
    -- Landlord owns the corresponding property_sales / property_rentals row
    EXISTS (
      SELECT 1 FROM public.property_sales ps
      WHERE ps.id = property_au_details.property_id
        AND ps.owner_id = auth.uid()
        AND property_au_details.property_type = 'sales'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.property_rentals pr
      WHERE pr.id = property_au_details.property_id
        AND pr.owner_id = auth.uid()
        AND property_au_details.property_type = 'rentals'
    )
  );

-- Authenticated users can read AU details for public listings
CREATE POLICY "property_au_details: authenticated read for visible properties"
  ON public.property_au_details
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMIT;
