-- ============================================================================
-- address_validate.sql — 物件地址欄位對齊驗證
-- 用法: psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/address_validate.sql
--
-- 在執行 address_fix.sql 之後跑此腳本，確認所有欄位符合預期格式。
-- 每個 check 都會列出「不合格」的列；0 rows = PASS。
-- ============================================================================

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo '  物件地址欄位對齊驗證'
\echo '══════════════════════════════════════════════════════════'

-- ── Check 1: address_street 應只含路/段/街/巷/弄名稱 ─────────
-- 不該包含：號碼、F/樓、之/室

\echo ''
\echo '── Check 1: address_street 不含號碼/樓層/單位 ──'

SELECT 'FAIL' AS status, type, id, title, address_street
FROM (
  SELECT 'sale' AS type, id, title, address_street
  FROM public.property_sales WHERE address_street IS NOT NULL
  UNION ALL
  SELECT 'rental', id, title, address_street
  FROM public.property_rentals WHERE address_street IS NOT NULL
) t
WHERE
  address_street ~ '\d+號'
  OR address_street ~* '\d+[fF]'
  OR address_street ~ '\d+樓'
  OR address_street ~ '\d+室';

\echo '  (0 rows = PASS)'

-- ── Check 2: address_number 格式應為 X號 或 X之Y號 ──────────
-- 不該包含：F/樓、之\d+(後面沒有號)、室

\echo ''
\echo '── Check 2: address_number 只含門牌號碼 ──'

SELECT 'FAIL' AS status, type, id, title, address_number
FROM (
  SELECT 'sale' AS type, id, title, address_number
  FROM public.property_sales WHERE address_number IS NOT NULL
  UNION ALL
  SELECT 'rental', id, title, address_number
  FROM public.property_rentals WHERE address_number IS NOT NULL
) t
WHERE
  -- 無號但含 F/樓（整個值是樓層）
  (address_number !~ '號' AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓'))
  -- 含號但尾部帶 F/樓
  OR (address_number ~ '號' AND (address_number ~ '號\s*\-?\d+[Ff樓]' OR address_number ~ '號\s*[Bb]\d+'))
  OR address_number ~ '\d+室';

\echo '  (0 rows = PASS)'

-- ── Check 3: address_floor 格式應為 XF / X樓 / BXF ──────────
-- 不該包含：號、之X、室

\echo ''
\echo '── Check 3: address_floor 只含樓層 ──'

SELECT 'FAIL' AS status, type, id, title, address_floor
FROM (
  SELECT 'sale' AS type, id, title, address_floor
  FROM public.property_sales WHERE address_floor IS NOT NULL
  UNION ALL
  SELECT 'rental', id, title, address_floor
  FROM public.property_rentals WHERE address_floor IS NOT NULL
) t
WHERE
  address_floor ~ '\d+號'
  OR address_floor ~ '之\d+'
  OR address_floor ~ '\d+室';

\echo '  (0 rows = PASS)'

-- ── Check 4: address_unit 格式應為 之X 或 X室 ───────────────
-- 不該包含：號、F/樓

\echo ''
\echo '── Check 4: address_unit 只含單位 ──'

SELECT 'FAIL' AS status, type, id, title, address_unit
FROM (
  SELECT 'sale' AS type, id, title, address_unit
  FROM public.property_sales WHERE address_unit IS NOT NULL
  UNION ALL
  SELECT 'rental', id, title, address_unit
  FROM public.property_rentals WHERE address_unit IS NOT NULL
) t
WHERE
  address_unit ~ '\d+號'
  OR address_unit ~* '\d+[fF]'
  OR address_unit ~ '\d+樓';

\echo '  (0 rows = PASS)'

-- ── Check 5: address_street 末尾應以路/段/街/巷/弄結尾 ───────
-- 合格範例: "通化街38巷", "基隆路一段"
-- 不合格: "通化街38巷8" (殘留數字)

\echo ''
\echo '── Check 5: address_street 尾字為路/段/街/巷/弄（允許空白） ──'

SELECT 'WARN' AS status, type, id, title, address_street
FROM (
  SELECT 'sale' AS type, id, title, address_street
  FROM public.property_sales
  WHERE address_street IS NOT NULL AND trim(address_street) != ''
  UNION ALL
  SELECT 'rental', id, title, address_street
  FROM public.property_rentals
  WHERE address_street IS NOT NULL AND trim(address_street) != ''
) t
WHERE trim(address_street) !~ '[路段街巷弄]$'
LIMIT 30;

\echo '  (0 rows = PASS; 如有 WARN 表示尾字不是路/段/街/巷/弄，可人工檢查)'

-- ── Check 6: 修復後的 address 一致性（重組值 vs 現值） ────────

\echo ''
\echo '── Check 6: address 是否與結構化欄位一致 ──'

SELECT 'MISMATCH' AS status, type, id, title, address AS "address(DB)",
  expected AS "address(預期)"
FROM (
  SELECT 'sale' AS type, id, title, address,
    trim(concat_ws(' ',
      NULLIF(trim(address_city), ''),
      NULLIF(trim(address_district), ''),
      NULLIF(trim(address_street), ''),
      NULLIF(trim(address_number), ''),
      NULLIF(trim(address_floor), ''),
      NULLIF(trim(address_unit), '')
    )) AS expected
  FROM public.property_sales
  WHERE address_city IS NOT NULL OR address_street IS NOT NULL
  UNION ALL
  SELECT 'rental', id, title, address,
    trim(concat_ws(' ',
      NULLIF(trim(address_city), ''),
      NULLIF(trim(address_district), ''),
      NULLIF(trim(address_street), ''),
      NULLIF(trim(address_number), ''),
      NULLIF(trim(address_floor), ''),
      NULLIF(trim(address_unit), '')
    )) AS expected
  FROM public.property_rentals
  WHERE address_city IS NOT NULL OR address_street IS NOT NULL
) t
WHERE address IS DISTINCT FROM expected
LIMIT 20;

\echo '  (0 rows = PASS)'

-- ── 統計摘要 ─────────────────────────────────────────────────

\echo ''
\echo '── 驗證統計摘要 ──'

WITH all_props AS (
  SELECT address_street, address_number, address_floor, address_unit
  FROM public.property_sales
  UNION ALL
  SELECT address_street, address_number, address_floor, address_unit
  FROM public.property_rentals
),
checks AS (
  SELECT
    -- street 不該含號/樓/室
    CASE WHEN address_street ~ '\d+號' OR address_street ~* '\d+[fF]'
           OR address_street ~ '\d+樓' OR address_street ~ '\d+室'
         THEN 1 ELSE 0 END AS street_bad,
    -- number: 無號但含F/樓 或 含號但尾部帶F/樓
    CASE WHEN (address_number !~ '號' AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓'))
           OR (address_number ~ '號' AND (address_number ~ '號\s*\-?\d+[Ff樓]' OR address_number ~ '號\s*[Bb]\d+'))
           OR address_number ~ '\d+室'
         THEN 1 ELSE 0 END AS number_bad,
    -- floor 不該含號/之/室
    CASE WHEN address_floor ~ '\d+號' OR address_floor ~ '之\d+'
           OR address_floor ~ '\d+室'
         THEN 1 ELSE 0 END AS floor_bad,
    -- unit 不該含號/樓
    CASE WHEN address_unit ~ '\d+號' OR address_unit ~* '\d+[fF]'
           OR address_unit ~ '\d+樓'
         THEN 1 ELSE 0 END AS unit_bad
  FROM all_props
)
SELECT
  sum(street_bad) AS "street仍有問題",
  sum(number_bad) AS "number仍有問題",
  sum(floor_bad)  AS "floor仍有問題",
  sum(unit_bad)   AS "unit仍有問題",
  CASE
    WHEN sum(street_bad) + sum(number_bad) + sum(floor_bad) + sum(unit_bad) = 0
    THEN '✅ 全部 PASS'
    ELSE '❌ 有殘留問題，請檢視上方 FAIL 列'
  END AS "結論"
FROM checks;

\echo ''
\echo '驗證完成。'
