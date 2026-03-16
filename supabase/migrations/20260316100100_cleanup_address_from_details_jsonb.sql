-- Remove address keys from details JSONB — these are now canonical in top-level columns.
-- Safe to run: read path no longer falls back to details for address fields (as of 2026-03-16).

UPDATE property_sales
SET details = details
  - 'addressCity'
  - 'addressDistrict'
  - 'addressStreet'
  - 'addressNumber'
  - 'addressFloor'
  - 'addressUnit'
WHERE details ?| ARRAY[
  'addressCity', 'addressDistrict', 'addressStreet',
  'addressNumber', 'addressFloor', 'addressUnit'
];

UPDATE property_rentals
SET details = details
  - 'addressCity'
  - 'addressDistrict'
  - 'addressStreet'
  - 'addressNumber'
  - 'addressFloor'
  - 'addressUnit'
WHERE details ?| ARRAY[
  'addressCity', 'addressDistrict', 'addressStreet',
  'addressNumber', 'addressFloor', 'addressUnit'
];
