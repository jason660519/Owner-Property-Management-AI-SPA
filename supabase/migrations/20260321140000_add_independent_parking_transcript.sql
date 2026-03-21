-- Migration: add has_independent_parking flag to property tables
-- Properties with independent parking spaces have their own separate building/land transcripts
-- that can be uploaded and AI-parsed independently from the main property transcripts.

ALTER TABLE property_sales
  ADD COLUMN IF NOT EXISTS has_independent_parking BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE property_rentals
  ADD COLUMN IF NOT EXISTS has_independent_parking BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN property_sales.has_independent_parking IS
  '是否含獨立產權車位（有獨立建物+土地謄本，可與房屋分開銷售）';

COMMENT ON COLUMN property_rentals.has_independent_parking IS
  '是否含獨立產權車位（有獨立建物+土地謄本，可與房屋分開出租）';
