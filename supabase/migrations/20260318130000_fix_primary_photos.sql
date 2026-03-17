-- For properties that have photos but none marked as primary,
-- promote the earliest photo (by created_at) to primary and assign sort_order = 1.

WITH first_photos AS (
  SELECT DISTINCT ON (property_id)
    id,
    property_id
  FROM property_photos
  WHERE property_id NOT IN (
    SELECT DISTINCT property_id FROM property_photos WHERE is_primary = true
  )
  ORDER BY property_id, created_at ASC
)
UPDATE property_photos pp
SET
  is_primary  = true,
  photo_type  = 'primary',
  sort_order  = 1
FROM first_photos fp
WHERE pp.id = fp.id;
