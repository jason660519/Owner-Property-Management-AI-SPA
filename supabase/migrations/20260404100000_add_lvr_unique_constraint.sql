-- filepath: supabase/migrations/20260404100000_add_lvr_unique_constraint.sql
-- 為實價登錄成交資料表增加唯一約束，以支援自動去重 (Upsert)
-- 唯一識別條件：縣市 + 行政區 + 交易日期 + 總價 + 建物面積 + 門牌區段摘要

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lvr_land_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE c.conname = 'lvr_land_transactions_unique_record'
        AND t.relname = 'lvr_land_transactions'
        AND n.nspname = 'public'
    ) THEN
      ALTER TABLE public.lvr_land_transactions
      ADD CONSTRAINT lvr_land_transactions_unique_record
      UNIQUE (city, district, transaction_date, total_price_twd, building_area_sqm, address_snippet);

      COMMENT ON CONSTRAINT lvr_land_transactions_unique_record ON public.lvr_land_transactions IS '防止重複匯入相同的實價登錄成交紀錄';
    END IF;
  END IF;
END $$;
