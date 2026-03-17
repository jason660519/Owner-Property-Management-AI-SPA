-- Add sort_order to property_photos for user-defined photo ordering.
-- 001 (sort_order=1) always maps to the primary photo; others start from 2.
-- Default 0 means "unset" and falls back to insertion order.

ALTER TABLE property_photos
  ADD COLUMN IF NOT EXISTS sort_order smallint NOT NULL DEFAULT 0;

-- Back-fill existing rows: primary photo gets 1, others get 0 (unordered)
UPDATE property_photos SET sort_order = 1 WHERE is_primary = true;
