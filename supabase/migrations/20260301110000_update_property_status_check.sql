-- Migration: Update property_sales and property_rentals status CHECK constraints
-- to use unified status values:
--   for_sale, for_rent, collecting_rent, sold, rented, pending, expired, invalid
-- Date: 2026-03-01

BEGIN;

-- ── Step 1: Drop old CHECK constraints ───────────────────────────────────
ALTER TABLE property_sales   DROP CONSTRAINT IF EXISTS property_sales_status_check;
ALTER TABLE property_rentals DROP CONSTRAINT IF EXISTS property_rentals_status_check;

-- ── Step 2: Migrate existing rows to new status values ───────────────────
UPDATE property_sales SET status = 'for_sale' WHERE status = 'available';
UPDATE property_sales SET status = 'expired'  WHERE status = 'archived';
-- 'pending' and 'sold' keep the same key

UPDATE property_rentals SET status = 'for_rent'        WHERE status = 'vacant';
UPDATE property_rentals SET status = 'collecting_rent' WHERE status = 'occupied';
UPDATE property_rentals SET status = 'pending'         WHERE status = 'maintenance';
UPDATE property_rentals SET status = 'expired'         WHERE status = 'archived';

-- ── Step 3: Add new unified CHECK constraints ────────────────────────────
ALTER TABLE property_sales
  ADD CONSTRAINT property_sales_status_check
  CHECK (status IN ('for_sale', 'for_rent', 'collecting_rent', 'sold', 'rented', 'pending', 'expired', 'invalid'));

ALTER TABLE property_rentals
  ADD CONSTRAINT property_rentals_status_check
  CHECK (status IN ('for_sale', 'for_rent', 'collecting_rent', 'sold', 'rented', 'pending', 'expired', 'invalid'));

-- ── Step 4: Update default values ────────────────────────────────────────
ALTER TABLE property_sales    ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE property_rentals  ALTER COLUMN status SET DEFAULT 'pending';

COMMIT;
