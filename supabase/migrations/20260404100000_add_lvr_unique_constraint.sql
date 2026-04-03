-- filepath: supabase/migrations/20260404100000_add_lvr_unique_constraint.sql
-- 為實價登錄成交資料表增加唯一約束，以支援自動去重 (Upsert)
-- 唯一識別條件：縣市 + 行政區 + 交易日期 + 總價 + 建物面積 + 門牌區段摘要

ALTER TABLE lvr_land_transactions 
ADD CONSTRAINT lvr_land_transactions_unique_record 
UNIQUE (city, district, transaction_date, total_price_twd, building_area_sqm, address_snippet);

-- 註解說明
COMMENT ON CONSTRAINT lvr_land_transactions_unique_record ON lvr_land_transactions IS '防止重複匯入相同的實價登錄成交紀錄';
