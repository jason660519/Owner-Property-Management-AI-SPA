-- ============================================================================
-- address_audit.sql — 物件地址欄位對齊診斷報告
-- 用法: psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/address_audit.sql
--
-- 檢查 property_sales / property_rentals 的結構化地址欄位是否有資料「串位」。
-- 常見問題：
--   1. address_street 包含門牌號碼 (如 "通化街38巷8號")
--   2. address_street 包含樓層 (如 "通化街38巷8號3F")
--   3. address_number 包含樓層/單位 (如 "8號3F")
--   4. address_floor 包含單位 (如 "3F之2")
-- ============================================================================

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo '  物件地址欄位對齊診斷報告'
\echo '══════════════════════════════════════════════════════════'
\echo ''

-- ── 1. 統計概覽 ──────────────────────────────────────────────

\echo '── 1. 各欄位填充率統計 ──'

SELECT
  'property_sales' AS "table",
  count(*) AS total,
  count(address_street) AS has_street,
  count(address_number) AS has_number,
  count(address_floor) AS has_floor,
  count(address_unit) AS has_unit
FROM public.property_sales
UNION ALL
SELECT
  'property_rentals',
  count(*),
  count(address_street),
  count(address_number),
  count(address_floor),
  count(address_unit)
FROM public.property_rentals;

-- ── 2. address_street 包含號碼或樓層 ─────────────────────────

\echo ''
\echo '── 2. address_street 包含「號」「F/樓」「室/之」(串位) ──'

WITH all_props AS (
  SELECT id, 'sale' AS type, title, address_street, address_number, address_floor, address_unit
  FROM public.property_sales
  WHERE address_street IS NOT NULL AND trim(address_street) != ''
  UNION ALL
  SELECT id, 'rental', title, address_street, address_number, address_floor, address_unit
  FROM public.property_rentals
  WHERE address_street IS NOT NULL AND trim(address_street) != ''
)
SELECT
  type AS "類型",
  id,
  title AS "物件名稱",
  address_street AS "street(現值)",
  address_number AS "number(現值)",
  address_floor AS "floor(現值)",
  address_unit AS "unit(現值)",
  CASE
    WHEN address_street ~ '\d+號' THEN '含門牌號'
    ELSE ''
  END AS "問題:含號",
  CASE
    WHEN address_street ~* '\d+[fF]' OR address_street ~ '\d+樓' THEN '含樓層'
    ELSE ''
  END AS "問題:含樓層",
  CASE
    WHEN address_street ~ '之\d+' OR address_street ~ '\d+室' THEN '含單位'
    ELSE ''
  END AS "問題:含單位"
FROM all_props
WHERE
  address_street ~ '\d+號'
  OR address_street ~* '\d+[fF]'
  OR address_street ~ '\d+樓'
  OR address_street ~ '之\d+'
  OR address_street ~ '\d+室'
ORDER BY type, id;

-- ── 3. address_number 包含樓層或單位 ─────────────────────────
-- 注意：「X之Y號」(如 65之2號) 是合法台灣門牌格式，不算串位。
-- 真正的問題是：
--   a) address_number 完全不含「號」，值是樓層 (如 "3F", "6樓")
--   b) address_number 含「號」但尾部附帶了 F/樓/室

\echo ''
\echo '── 3a. address_number 完全不含號（整筆是樓層）──'

WITH all_props AS (
  SELECT id, 'sale' AS type, title, address_number, address_floor, address_unit
  FROM public.property_sales
  WHERE address_number IS NOT NULL AND trim(address_number) != ''
  UNION ALL
  SELECT id, 'rental', title, address_number, address_floor, address_unit
  FROM public.property_rentals
  WHERE address_number IS NOT NULL AND trim(address_number) != ''
)
SELECT type AS "類型", id, title AS "物件名稱",
  address_number AS "number(現值)", address_floor AS "floor(現值)"
FROM all_props
WHERE address_number !~ '號'
  AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓')
ORDER BY type, id;

\echo ''
\echo '── 3b. address_number 含號但尾部附帶樓層 ──'

WITH all_props AS (
  SELECT id, 'sale' AS type, title, address_number, address_floor, address_unit
  FROM public.property_sales
  WHERE address_number IS NOT NULL AND trim(address_number) != ''
  UNION ALL
  SELECT id, 'rental', title, address_number, address_floor, address_unit
  FROM public.property_rentals
  WHERE address_number IS NOT NULL AND trim(address_number) != ''
)
SELECT type AS "類型", id, title AS "物件名稱",
  address_number AS "number(現值)", address_floor AS "floor(現值)"
FROM all_props
WHERE address_number ~ '號'
  AND (address_number ~ '號\s*\-?\d+[Ff樓]' OR address_number ~ '號\s*[Bb]\d+')
ORDER BY type, id;

-- ── 4. address_floor 包含號碼或單位 ──────────────────────────

\echo ''
\echo '── 4. address_floor 包含「號」或「之/室」(串位) ──'

WITH all_props AS (
  SELECT id, 'sale' AS type, title, address_floor, address_number, address_unit
  FROM public.property_sales
  WHERE address_floor IS NOT NULL AND trim(address_floor) != ''
  UNION ALL
  SELECT id, 'rental', title, address_floor, address_number, address_unit
  FROM public.property_rentals
  WHERE address_floor IS NOT NULL AND trim(address_floor) != ''
)
SELECT
  type AS "類型",
  id,
  title AS "物件名稱",
  address_floor AS "floor(現值)",
  address_number AS "number(現值)",
  address_unit AS "unit(現值)",
  CASE WHEN address_floor ~ '\d+號' THEN '含門牌號' ELSE '' END AS "問題:含號",
  CASE WHEN address_floor ~ '之\d+' OR address_floor ~ '\d+室' THEN '含單位' ELSE '' END AS "問題:含單位"
FROM all_props
WHERE
  address_floor ~ '\d+號'
  OR address_floor ~ '之\d+'
  OR address_floor ~ '\d+室'
ORDER BY type, id;

-- ── 5. address_number 與 address_street 尾段重複 ────────────

\echo ''
\echo '── 5. address_street 尾段與 address_number 重複 ──'

WITH all_props AS (
  SELECT id, 'sale' AS type, title, address_street, address_number
  FROM public.property_sales
  WHERE address_street IS NOT NULL AND address_number IS NOT NULL
  UNION ALL
  SELECT id, 'rental', title, address_street, address_number
  FROM public.property_rentals
  WHERE address_street IS NOT NULL AND address_number IS NOT NULL
)
SELECT
  type AS "類型",
  id,
  title AS "物件名稱",
  address_street AS "street",
  address_number AS "number",
  '尾段包含 number 值' AS "問題"
FROM all_props
WHERE address_street LIKE '%' || address_number
ORDER BY type, id;

-- ── 6. 問題統計摘要 ──────────────────────────────────────────

\echo ''
\echo '── 6. 問題統計摘要 ──'

WITH all_props AS (
  SELECT
    address_street, address_number, address_floor, address_unit
  FROM public.property_sales
  UNION ALL
  SELECT
    address_street, address_number, address_floor, address_unit
  FROM public.property_rentals
),
flagged AS (
  SELECT
    (address_street ~ '\d+號')::int AS street_has_number,
    (address_street ~* '\d+[fF]' OR address_street ~ '\d+樓')::int AS street_has_floor,
    (address_street ~ '\d+室')::int AS street_has_unit,
    -- number 無號但含 F/樓（整筆是樓層）
    (address_number !~ '號' AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓'))::int AS number_is_floor,
    -- number 含號但尾部帶 F/樓
    (address_number ~ '號' AND (address_number ~ '號\s*\-?\d+[Ff樓]' OR address_number ~ '號\s*[Bb]\d+'))::int AS number_has_trailing_floor,
    (address_floor ~ '\d+號')::int AS floor_has_number,
    (address_floor ~ '之\d+' OR address_floor ~ '\d+室')::int AS floor_has_unit
  FROM all_props
)
SELECT
  sum(street_has_number)        AS "street含號",
  sum(street_has_floor)         AS "street含樓層",
  sum(street_has_unit)          AS "street含單位",
  sum(number_is_floor)          AS "number全為樓層",
  sum(number_has_trailing_floor) AS "number含尾部樓層",
  sum(floor_has_number)         AS "floor含號",
  sum(floor_has_unit)           AS "floor含單位"
FROM flagged;

\echo ''
\echo '診斷完成。請檢視上述報告後執行 address_fix.sql 修復。'
