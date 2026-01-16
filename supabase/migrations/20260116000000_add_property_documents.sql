-- Property Documents Table for OCR Integration
-- Created: 2026-01-16
-- Purpose: Store uploaded documents and OCR results

-- 文件表（用於 OCR 處理）
CREATE TABLE IF NOT EXISTS property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),

  -- 檔案資訊
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'pdf', 'image', etc.
  storage_path TEXT NOT NULL,  -- Supabase Storage 路徑
  file_size INTEGER,  -- 檔案大小（bytes）

  -- OCR 相關
  ocr_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  ocr_result JSONB,  -- OCR 解析的 Jason JSON 結果
  ocr_processed_at TIMESTAMPTZ,
  ocr_error TEXT,  -- OCR 錯誤訊息

  -- JSON Storage 路徑
  json_storage_path TEXT,  -- Storage 中 JSON 檔案的路徑

  -- 審核狀態
  review_status TEXT DEFAULT 'pending',  -- pending, confirmed, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 Row Level Security
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- RLS 政策：仲介只能看到自己的文件
CREATE POLICY "仲介只能查看自己的文件"
  ON property_documents FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "仲介只能新增自己的文件"
  ON property_documents FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "仲介只能更新自己的文件"
  ON property_documents FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "仲介只能刪除自己的文件"
  ON property_documents FOR DELETE
  USING (auth.uid() = agent_id);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_agent ON property_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_status ON property_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_property_documents_review ON property_documents(review_status);
CREATE INDEX IF NOT EXISTS idx_ocr_result ON property_documents USING GIN (ocr_result);

-- 自動更新 updated_at 的 trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_documents_updated_at
  BEFORE UPDATE ON property_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE property_documents IS '物件文件表，用於儲存 PDF 謄本等文件及其 OCR 結果';
COMMENT ON COLUMN property_documents.ocr_result IS 'OCR 解析的完整 Jason JSON 結構';
COMMENT ON COLUMN property_documents.json_storage_path IS 'Supabase Storage 中 JSON 檔案的路徑: transcripts/{property_id}/{document_id}.json';
COMMENT ON COLUMN property_documents.review_status IS '審核狀態：pending-待審核, confirmed-已確認, rejected-已駁回';
