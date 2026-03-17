-- Migration: backfill property_owners from transcript data
-- Affects properties that have buildingTranscript/landTranscript ownership data
-- but were saved before the auto-sync logic existed in savePropertyTranscriptData.
--
-- Priority: buildingTranscript.ownership first, then landTranscript.ownership as fallback.

-- ── Sales: building transcript owners ────────────────────────────────────────
INSERT INTO property_owners (property_id, property_type, owner_name)
SELECT
  ps.id          AS property_id,
  'sale'         AS property_type,
  elem->>'ownerName' AS owner_name
FROM property_sales ps
CROSS JOIN LATERAL jsonb_array_elements(
  ps.details->'buildingTranscript'->'ownership'
) AS elem
WHERE
  NOT EXISTS (SELECT 1 FROM property_owners po WHERE po.property_id = ps.id)
  AND ps.details->'buildingTranscript'->'ownership' IS NOT NULL
  AND (elem->>'ownerName') IS NOT NULL
  AND trim(elem->>'ownerName') <> '';

-- ── Sales: land transcript owners (only when no building transcript available) ──
INSERT INTO property_owners (property_id, property_type, owner_name)
SELECT
  ps.id          AS property_id,
  'sale'         AS property_type,
  elem->>'ownerName' AS owner_name
FROM property_sales ps
CROSS JOIN LATERAL jsonb_array_elements(
  ps.details->'landTranscript'->'ownership'
) AS elem
WHERE
  NOT EXISTS (SELECT 1 FROM property_owners po WHERE po.property_id = ps.id)
  AND ps.details->'landTranscript'->'ownership'  IS NOT NULL
  AND ps.details->'buildingTranscript'->'ownership' IS NULL
  AND (elem->>'ownerName') IS NOT NULL
  AND trim(elem->>'ownerName') <> '';

-- ── Rentals: building transcript owners ──────────────────────────────────────
INSERT INTO property_owners (property_id, property_type, owner_name)
SELECT
  pr.id          AS property_id,
  'rental'       AS property_type,
  elem->>'ownerName' AS owner_name
FROM property_rentals pr
CROSS JOIN LATERAL jsonb_array_elements(
  pr.details->'buildingTranscript'->'ownership'
) AS elem
WHERE
  NOT EXISTS (SELECT 1 FROM property_owners po WHERE po.property_id = pr.id)
  AND pr.details->'buildingTranscript'->'ownership' IS NOT NULL
  AND (elem->>'ownerName') IS NOT NULL
  AND trim(elem->>'ownerName') <> '';

-- ── Rentals: land transcript owners (only when no building transcript available) ──
INSERT INTO property_owners (property_id, property_type, owner_name)
SELECT
  pr.id          AS property_id,
  'rental'       AS property_type,
  elem->>'ownerName' AS owner_name
FROM property_rentals pr
CROSS JOIN LATERAL jsonb_array_elements(
  pr.details->'landTranscript'->'ownership'
) AS elem
WHERE
  NOT EXISTS (SELECT 1 FROM property_owners po WHERE po.property_id = pr.id)
  AND pr.details->'landTranscript'->'ownership'  IS NOT NULL
  AND pr.details->'buildingTranscript'->'ownership' IS NULL
  AND (elem->>'ownerName') IS NOT NULL
  AND trim(elem->>'ownerName') <> '';
