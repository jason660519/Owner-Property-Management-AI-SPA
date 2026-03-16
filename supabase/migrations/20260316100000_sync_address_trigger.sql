-- Auto-sync the legacy `address` text column from structured address parts.
-- Fires on INSERT and UPDATE for both property tables whenever any address part changes.

CREATE OR REPLACE FUNCTION sync_address_from_parts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.address := NULLIF(TRIM(
    COALESCE(NEW.address_city, '')      ||
    COALESCE(NEW.address_district, '')  ||
    COALESCE(NEW.address_street, '')    ||
    COALESCE(NEW.address_number, '')    ||
    COALESCE(NEW.address_floor, '')     ||
    COALESCE(NEW.address_unit, '')
  ), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- property_sales
DROP TRIGGER IF EXISTS trg_sync_address_sales ON property_sales;
CREATE TRIGGER trg_sync_address_sales
  BEFORE INSERT OR UPDATE OF
    address_city, address_district, address_street,
    address_number, address_floor, address_unit
  ON property_sales
  FOR EACH ROW EXECUTE FUNCTION sync_address_from_parts();

-- property_rentals
DROP TRIGGER IF EXISTS trg_sync_address_rentals ON property_rentals;
CREATE TRIGGER trg_sync_address_rentals
  BEFORE INSERT OR UPDATE OF
    address_city, address_district, address_street,
    address_number, address_floor, address_unit
  ON property_rentals
  FOR EACH ROW EXECUTE FUNCTION sync_address_from_parts();

-- Backfill: re-sync existing rows that already have structured parts
UPDATE property_sales
SET address_city = address_city  -- trigger fires on any column in the OF list
WHERE address_city IS NOT NULL
   OR address_district IS NOT NULL
   OR address_street IS NOT NULL;

UPDATE property_rentals
SET address_city = address_city
WHERE address_city IS NOT NULL
   OR address_district IS NOT NULL
   OR address_street IS NOT NULL;
