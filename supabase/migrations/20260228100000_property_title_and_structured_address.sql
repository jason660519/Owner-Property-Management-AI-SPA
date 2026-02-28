-- Add 物件名稱 (title) and 結構化地址 (縣市/區/路/門牌/樓層/單位) to property_sales and property_rentals.
-- address remains the full composed string for backward compatibility and search.

-- property_sales
ALTER TABLE public.property_sales
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_district TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_floor TEXT,
  ADD COLUMN IF NOT EXISTS address_unit TEXT;

COMMENT ON COLUMN public.property_sales.title IS '物件名稱（例：敦南華夏四房+車位）';
COMMENT ON COLUMN public.property_sales.address_city IS '地址：縣市';
COMMENT ON COLUMN public.property_sales.address_district IS '地址：區';
COMMENT ON COLUMN public.property_sales.address_street IS '地址：路/段/街';
COMMENT ON COLUMN public.property_sales.address_number IS '地址：門牌號碼';
COMMENT ON COLUMN public.property_sales.address_floor IS '地址：樓層';
COMMENT ON COLUMN public.property_sales.address_unit IS '地址：單位號碼';

-- property_rentals
ALTER TABLE public.property_rentals
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_district TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_floor TEXT,
  ADD COLUMN IF NOT EXISTS address_unit TEXT;

COMMENT ON COLUMN public.property_rentals.title IS '物件名稱（例：仁愛鳳翔4房）';
COMMENT ON COLUMN public.property_rentals.address_city IS '地址：縣市';
COMMENT ON COLUMN public.property_rentals.address_district IS '地址：區';
COMMENT ON COLUMN public.property_rentals.address_street IS '地址：路/段/街';
COMMENT ON COLUMN public.property_rentals.address_number IS '地址：門牌號碼';
COMMENT ON COLUMN public.property_rentals.address_floor IS '地址：樓層';
COMMENT ON COLUMN public.property_rentals.address_unit IS '地址：單位號碼';

-- Backfill from details JSONB for existing rows
UPDATE public.property_sales
SET
  title = COALESCE(title, details->>'title'),
  address_city = COALESCE(address_city, details->>'addressCity'),
  address_district = COALESCE(address_district, details->>'addressDistrict'),
  address_street = COALESCE(address_street, details->>'addressStreet'),
  address_number = COALESCE(address_number, details->>'addressNumber'),
  address_floor = COALESCE(address_floor, details->>'addressFloor'),
  address_unit = COALESCE(address_unit, details->>'addressUnit')
WHERE details IS NOT NULL AND (details != '{}'::jsonb);

UPDATE public.property_rentals
SET
  title = COALESCE(title, details->>'title'),
  address_city = COALESCE(address_city, details->>'addressCity'),
  address_district = COALESCE(address_district, details->>'addressDistrict'),
  address_street = COALESCE(address_street, details->>'addressStreet'),
  address_number = COALESCE(address_number, details->>'addressNumber'),
  address_floor = COALESCE(address_floor, details->>'addressFloor'),
  address_unit = COALESCE(address_unit, details->>'addressUnit')
WHERE details IS NOT NULL AND (details != '{}'::jsonb);
