-- ============================================================
-- ai_model_role_tags: Role/function classification tag definitions
-- ai_model_role_assignments: Many-to-many model × tag mapping
-- ============================================================

-- 1. Role tags definition table
CREATE TABLE IF NOT EXISTS ai_model_role_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key TEXT UNIQUE NOT NULL,
  tag_label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_model_role_tags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all tags
CREATE POLICY "ai_model_role_tags_select"
  ON ai_model_role_tags FOR SELECT
  TO authenticated
  USING (true);

-- Service role has full access
CREATE POLICY "ai_model_role_tags_service_all"
  ON ai_model_role_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger (manual function to avoid moddatetime extension dependency)
CREATE OR REPLACE FUNCTION update_ai_model_role_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_ai_model_role_tags
  BEFORE UPDATE ON ai_model_role_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_model_role_tags_updated_at();

-- Seed 10 predefined tags
INSERT INTO ai_model_role_tags (tag_key, tag_label, description, sort_order, is_system) VALUES
  ('online_classification',    '網路查詢分類', '由 AI 根據訓練知識，查詢各模型的公開能力資訊來推薦分類', 1,  true),
  ('offline_classification',   'API Response 分類', '根據各分頁實際測試模型後的 API 回應結果來推薦分類', 2,  true),
  ('transcript_detection',     '謄本建號地號筆數偵測組',         '負責偵測 user 上傳的謄本中，有幾筆建號、幾筆地號', 3,  true),
  ('transcript_review',        '謄本建號地號筆數審核組',         '負責審核偵測組偵測到的建號、地號筆數是否正確', 4,  true),
  ('transcript_visual_parse',  '謄本視覺解析組',                 '負責解析 user 指定的謄本內容', 5,  true),
  ('transcript_audit',         '謄本審核組',                     '負責審核視覺解析組解析出來的謄本內容是否正確', 6,  true),
  ('photo_generation',         '照片生成編輯組',                 '負責將室內照片中的物品清空等照片生成與編輯功能', 7,  true),
  ('video_generation',         '影片生成組 P2V',                 '在建地照片上生成蓋別墅的動畫等 Picture-to-Video 功能', 8,  true),
  ('ad_copy_generation',       '廣告文案生成組',                 '主要用來生成廣告文案', 9,  true),
  ('voice_generation',         '聲優語音生成組',                 '生成介紹物件的語音檔等 TTS 功能', 10, true)
ON CONFLICT (tag_key) DO NOTHING;

-- Index for fast lookup by sort order
CREATE INDEX IF NOT EXISTS idx_ai_model_role_tags_sort
  ON ai_model_role_tags (sort_order);


-- 2. Model × tag assignment table (per user)
CREATE TABLE IF NOT EXISTS ai_model_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  tag_key TEXT NOT NULL REFERENCES ai_model_role_tags(tag_key) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('ai_online', 'ai_offline', 'manual')),
  confidence REAL NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  classified_by TEXT NOT NULL DEFAULT 'user',

  UNIQUE (user_id, provider, model_id, tag_key)
);

-- Enable RLS
ALTER TABLE ai_model_role_assignments ENABLE ROW LEVEL SECURITY;

-- Users manage their own assignments
CREATE POLICY "ai_model_role_assignments_user_select"
  ON ai_model_role_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ai_model_role_assignments_user_insert"
  ON ai_model_role_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_model_role_assignments_user_update"
  ON ai_model_role_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_model_role_assignments_user_delete"
  ON ai_model_role_assignments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "ai_model_role_assignments_service_all"
  ON ai_model_role_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_role_assignments_user
  ON ai_model_role_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_model_role_assignments_model
  ON ai_model_role_assignments (provider, model_id);

CREATE INDEX IF NOT EXISTS idx_ai_model_role_assignments_tag
  ON ai_model_role_assignments (tag_key);
