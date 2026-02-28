-- Backfill 物件名稱 (title) and 結構化地址 from existing address string and details.
-- Parses address like "台北市大安區敦化南路117號" into address_city, address_district, address_street, address_number.

-- property_sales: parse address and ensure title
UPDATE public.property_sales
SET
  title = COALESCE(NULLIF(trim(title), ''), details->>'title', address),
  address_city = COALESCE(
    NULLIF(trim(address_city), ''),
    (regexp_match(address, '^(.*?[市縣])'))[1]
  ),
  address_district = COALESCE(
    NULLIF(trim(address_district), ''),
    (regexp_match(address, '[市縣]([^市縣]*?區)'))[1]
  ),
  address_street = COALESCE(
    NULLIF(trim(address_street), ''),
    trim((regexp_match(address, '區(.+?)(?=\d*號|$)'))[1])
  ),
  address_number = COALESCE(
    NULLIF(trim(address_number), ''),
    (regexp_match(address, '(\d+號)'))[1]
  )
WHERE address IS NOT NULL AND trim(address) != '';

-- property_rentals: same
UPDATE public.property_rentals
SET
  title = COALESCE(NULLIF(trim(title), ''), details->>'title', address),
  address_city = COALESCE(
    NULLIF(trim(address_city), ''),
    (regexp_match(address, '^(.*?[市縣])'))[1]
  ),
  address_district = COALESCE(
    NULLIF(trim(address_district), ''),
    (regexp_match(address, '[市縣]([^市縣]*?區)'))[1]
  ),
  address_street = COALESCE(
    NULLIF(trim(address_street), ''),
    trim((regexp_match(address, '區(.+?)(?=\d*號|$)'))[1])
  ),
  address_number = COALESCE(
    NULLIF(trim(address_number), ''),
    (regexp_match(address, '(\d+號)'))[1]
  )
WHERE address IS NOT NULL AND trim(address) != '';

-- Set sample 物件名稱 for rows that still have generic title (e.g. same as address)
-- so list shows friendly names like 敦南華夏四房+車位
WITH samples AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.property_sales
)
UPDATE public.property_sales p
SET title = v.name
FROM samples s,
LATERAL (VALUES
  ('敦南華夏四房+車位'),
  ('仁愛鳳翔4房'),
  ('信義陶竹隱園'),
  ('大安森林景觀宅'),
  ('松山機場捷運寓所'),
  ('中山雙捷運美寓'),
  ('內湖科學園區旁三房'),
  ('南港車站共構宅'),
  ('文山景美靜巷華廈'),
  ('北投溫泉養生宅'),
  ('中正博愛特區名邸'),
  ('信義區現代都會公寓'),
  ('新店悠然獨棟別墅'),
  ('大安區精品豪宅'),
  ('板橋新埔捷運三房'),
  ('永和頂溪站旁兩房'),
  ('中和景安收租套房'),
  ('新莊副都心四房'),
  ('土城海山捷運華廈'),
  ('蘆洲捷運共構宅')
) AS v(name)
WHERE p.id = s.id AND s.rn <= 20 AND (p.title IS NULL OR p.title = p.address);

WITH samples AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.property_rentals
)
UPDATE public.property_rentals p
SET title = v.name
FROM samples s,
LATERAL (VALUES
  ('淡水河岸海景套房'),
  ('板橋文化路收租兩房'),
  ('新店七張捷運套房'),
  ('中和景安站旁雅房'),
  ('永和頂溪獨立套房'),
  ('三重菜寮捷運三房'),
  ('新莊頭前庄兩房'),
  ('土城海山站旁套房'),
  ('蘆洲捷運共構小宅'),
  ('樹林車站前收租案'),
  ('汐止東湖兩房車'),
  ('鶯歌鳳鳴重劃三房'),
  ('三峽北大特區美寓'),
  ('林口A9捷運兩房'),
  ('五股洲子洋套房'),
  ('泰山明志路兩房'),
  ('八里左岸景觀宅'),
  ('深坑老街旁收租案'),
  ('石碇靜巷華廈'),
  ('坪林茶鄉度假宅')
) AS v(name)
WHERE p.id = s.id AND s.rn <= 20 AND (p.title IS NULL OR p.title = p.address);
