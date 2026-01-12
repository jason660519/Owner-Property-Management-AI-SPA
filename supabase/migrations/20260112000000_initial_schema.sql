-- Initial schema for Owner Real Estate Agent SaaS
-- Created: 2026-01-12

-- 物件表
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id),
  address TEXT NOT NULL,
  district TEXT,
  total_area NUMERIC,
  building_age INTEGER,
  transcript_data JSONB,  -- 謄本解析資料
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 照片表
CREATE TABLE IF NOT EXISTS property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 客戶表
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 房屋預約看房表
CREATE TABLE IF NOT EXISTS property_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',  -- pending, confirmed, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_appointments ENABLE ROW LEVEL SECURITY;

-- 政策：仲介只能看到自己的資料
CREATE POLICY "仲介只能查看自己的物件"
  ON properties FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "仲介只能新增自己的物件"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "仲介只能更新自己的物件"
  ON properties FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "仲介只能刪除自己的物件"
  ON properties FOR DELETE
  USING (auth.uid() = agent_id);

-- 照片政策
CREATE POLICY "仲介可以查看自己物件的照片"
  ON property_photos FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "仲介可以新增自己物件的照片"
  ON property_photos FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE agent_id = auth.uid()
    )
  );

-- 客戶政策
CREATE POLICY "仲介只能查看自己的客戶"
  ON clients FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "仲介只能新增自己的客戶"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- 預約政策
CREATE POLICY "仲介可以查看自己物件的預約"
  ON property_appointments FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "仲介可以新增自己物件的預約"
  ON property_appointments FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE agent_id = auth.uid()
    )
  );

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_data ON properties USING GIN (transcript_data);
CREATE INDEX IF NOT EXISTS idx_property_photos_property ON property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property ON property_appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON property_appointments(scheduled_at);
