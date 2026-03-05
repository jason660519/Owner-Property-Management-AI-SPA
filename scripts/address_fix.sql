-- ============================================================================
-- address_fix.sql — 物件地址欄位重新對齊
-- 用法: psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/address_fix.sql
--
-- 修復 address_street / address_number / address_floor / address_unit 串位問題。
--
-- ⚠️  執行前請先跑 address_audit.sql 確認問題範圍
-- ⚠️  本腳本在 transaction 中執行，出錯自動 rollback
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- Phase A: 從 address_street 拆分外洩的號碼、樓層、單位
--
-- 台灣地址街路名稱一定以「路/段/街/巷/弄」結尾。如果 street 在這些字之後
-- 還有數字+號、F/樓、之/室，表示號碼/樓層/單位串到了 street 欄位。
-- 修復方式：用貪婪正則截斷到最後一個路/段/街/巷/弄，其餘拆到正確欄位。
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══ Phase A: 修正 address_street 中的串位資料 ═══'

-- A: property_sales
\echo '  A: property_sales'

UPDATE public.property_sales
SET
  address_number = COALESCE(
    NULLIF(trim(address_number), ''),
    (regexp_match(address_street, '(\d+(?:[之\-]\d+)?號)'))[1]
  ),
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    (regexp_match(address_street, '號\s*(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1]
  ),
  address_unit = COALESCE(
    NULLIF(trim(address_unit), ''),
    (regexp_match(address_street, '[Ff樓]\s*(之\d+|\d+室|[A-Z]\-?\d*室)'))[1]
  ),
  -- 截斷到最後一個 路/段/街/巷/弄（greedy .*）
  address_street = COALESCE(
    NULLIF(trim(
      (regexp_match(address_street, '^(.*(?:路|段|街|巷|弄))'))[1]
    ), ''),
    address_street
  )
WHERE
  address_street IS NOT NULL
  AND (
    address_street ~ '\d+號'
    OR address_street ~* '\d+[fF]'
    OR address_street ~ '\d+樓'
  );

-- A: property_rentals
\echo '  A: property_rentals'

UPDATE public.property_rentals
SET
  address_number = COALESCE(
    NULLIF(trim(address_number), ''),
    (regexp_match(address_street, '(\d+(?:[之\-]\d+)?號)'))[1]
  ),
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    (regexp_match(address_street, '號\s*(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1]
  ),
  address_unit = COALESCE(
    NULLIF(trim(address_unit), ''),
    (regexp_match(address_street, '[Ff樓]\s*(之\d+|\d+室|[A-Z]\-?\d*室)'))[1]
  ),
  address_street = COALESCE(
    NULLIF(trim(
      (regexp_match(address_street, '^(.*(?:路|段|街|巷|弄))'))[1]
    ), ''),
    address_street
  )
WHERE
  address_street IS NOT NULL
  AND (
    address_street ~ '\d+號'
    OR address_street ~* '\d+[fF]'
    OR address_street ~ '\d+樓'
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- Phase B: 從 address_number 拆分外洩的樓層、單位
--
-- 重要：「X之Y號」(如 65之2號) 是合法的台灣門牌格式，不可拆開。
-- 只處理兩種情況：
--   B1: address_number 完全不含「號」，整個值是樓層 (如 "3F", "6樓", "B3-8樓")
--   B2: address_number 含「號」但尾部附帶了樓層/單位 (如 "8號3F")
--       注意 address_number 內的「之\d+號」是合法門牌，不動。
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══ Phase B: 修正 address_number 中的串位資料 ═══'

-- B1: address_number 完全不含「號」→ 整筆搬到 address_floor
\echo '  B1: number 全為樓層(無號) → 搬到 floor'

UPDATE public.property_sales
SET
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    trim(address_number)
  ),
  address_number = NULL
WHERE
  address_number IS NOT NULL
  AND address_number !~ '號'
  AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓');

UPDATE public.property_rentals
SET
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    trim(address_number)
  ),
  address_number = NULL
WHERE
  address_number IS NOT NULL
  AND address_number !~ '號'
  AND (address_number ~* '\d+[fF]' OR address_number ~ '\d+樓');

-- B2: address_number 含「號」但尾部有樓層
-- 例如 "8號3F" → number="8號", floor="3F"
-- 排除 "X之Y號"（合法門牌）不影響
\echo '  B2: number 含號+尾部樓層 → 拆分'

UPDATE public.property_sales
SET
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    (regexp_match(address_number, '號\s*(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1]
  ),
  address_number = (regexp_match(address_number, '^(.*?號)'))[1]
WHERE
  address_number IS NOT NULL
  AND address_number ~ '號'
  AND address_number ~ '號\s*\-?\d+[Ff樓]|號\s*[Bb]\d+';

UPDATE public.property_rentals
SET
  address_floor = COALESCE(
    NULLIF(trim(address_floor), ''),
    (regexp_match(address_number, '號\s*(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1]
  ),
  address_number = (regexp_match(address_number, '^(.*?號)'))[1]
WHERE
  address_number IS NOT NULL
  AND address_number ~ '號'
  AND address_number ~ '號\s*\-?\d+[Ff樓]|號\s*[Bb]\d+';

-- ══════════════════════════════════════════════════════════════════════════════
-- Phase C: 從 address_floor 拆分外洩的單位
-- 例如 "3F之2" → floor="3F", unit="之2"
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══ Phase C: 修正 address_floor 中的串位資料 ═══'

UPDATE public.property_sales
SET
  address_unit = COALESCE(
    NULLIF(trim(address_unit), ''),
    (regexp_match(address_floor, '[Ff樓]\s*(之\d+|\d+室|[A-Z]\-?\d*室)'))[1]
  ),
  address_floor = COALESCE(
    (regexp_match(address_floor, '^(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1],
    address_floor
  )
WHERE
  address_floor IS NOT NULL
  AND (address_floor ~ '之\d+' OR address_floor ~ '\d+室' OR address_floor ~ '[A-Z]\-?\d*室');

UPDATE public.property_rentals
SET
  address_unit = COALESCE(
    NULLIF(trim(address_unit), ''),
    (regexp_match(address_floor, '[Ff樓]\s*(之\d+|\d+室|[A-Z]\-?\d*室)'))[1]
  ),
  address_floor = COALESCE(
    (regexp_match(address_floor, '^(\-?\d+[Ff樓]|[Bb]\d+[Ff]?)'))[1],
    address_floor
  )
WHERE
  address_floor IS NOT NULL
  AND (address_floor ~ '之\d+' OR address_floor ~ '\d+室' OR address_floor ~ '[A-Z]\-?\d*室');

-- ══════════════════════════════════════════════════════════════════════════════
-- Phase D: 去除 street 末尾殘留數字
--
-- Phase A 截斷到最後一個路/段/街/巷/弄後，street 應無殘留數字+號。
-- 但有些邊緣案例（如 street 不以路/段/街/巷/弄開頭的地名）可能仍有殘留。
-- 此步驟在 street 末尾有 X號 時再截一次。
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══ Phase D: 清除 street 末尾殘留號碼 ═══'

UPDATE public.property_sales
SET address_street = trim(regexp_replace(address_street, '\d+號.*$', ''))
WHERE address_street IS NOT NULL AND address_street ~ '\d+號';

UPDATE public.property_rentals
SET address_street = trim(regexp_replace(address_street, '\d+號.*$', ''))
WHERE address_street IS NOT NULL AND address_street ~ '\d+號';

-- ══════════════════════════════════════════════════════════════════════════════
-- Phase E: 用修正後的結構化欄位重新組合 address
-- ══════════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══ Phase E: 重組 address ═══'

UPDATE public.property_sales
SET address = trim(concat_ws(' ',
  NULLIF(trim(address_city), ''),
  NULLIF(trim(address_district), ''),
  NULLIF(trim(address_street), ''),
  NULLIF(trim(address_number), ''),
  NULLIF(trim(address_floor), ''),
  NULLIF(trim(address_unit), '')
))
WHERE address_city IS NOT NULL OR address_street IS NOT NULL;

UPDATE public.property_rentals
SET address = trim(concat_ws(' ',
  NULLIF(trim(address_city), ''),
  NULLIF(trim(address_district), ''),
  NULLIF(trim(address_street), ''),
  NULLIF(trim(address_number), ''),
  NULLIF(trim(address_floor), ''),
  NULLIF(trim(address_unit), '')
))
WHERE address_city IS NOT NULL OR address_street IS NOT NULL;

COMMIT;

\echo ''
\echo '✅ 修復完成。請跑 address_validate.sql 驗證結果。'
