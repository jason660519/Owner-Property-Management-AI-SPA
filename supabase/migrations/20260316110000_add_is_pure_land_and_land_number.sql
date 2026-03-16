-- Add is_pure_land flag and land_number to property tables.
-- is_pure_land: true when only a land transcript exists (no building transcript).
-- land_number:  canonical land parcel ID sourced from 土地謄本 OCR (e.g. 大安區○○段 第0345地號).

ALTER TABLE property_sales
  ADD COLUMN IF NOT EXISTS is_pure_land BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS land_number   TEXT;

ALTER TABLE property_rentals
  ADD COLUMN IF NOT EXISTS is_pure_land BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS land_number   TEXT;
