-- filepath: supabase/migrations/20260403150000_create_lvr_land_transactions.sql
-- 建立實價登錄成交資料表，用於快速產出成交行情報表

CREATE TABLE IF NOT EXISTS lvr_land_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    total_price_twd BIGINT NOT NULL,
    building_area_sqm NUMERIC(15,2),
    unit_price_per_sqm NUMERIC(15,2),
    building_type TEXT,
    floor TEXT,
    address_snippet TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    village TEXT,
    land_section_tokens TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 基礎查詢索引 (縣市、行政區、日期)
CREATE INDEX IF NOT EXISTS idx_lvr_city_district_date 
ON lvr_land_transactions (city, district, transaction_date DESC);

-- 同里查詢索引
CREATE INDEX IF NOT EXISTS idx_lvr_village_date 
ON lvr_land_transactions (village, transaction_date DESC)
WHERE village IS NOT NULL;

-- 空間查詢優化 (使用內建地球曲率計算，不需 PostGIS 亦可達成高效半徑搜尋)
CREATE INDEX IF NOT EXISTS idx_lvr_lat_lng 
ON lvr_land_transactions (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 註解說明
COMMENT ON TABLE lvr_land_transactions IS '內政部實價登錄成交資料倉儲';
