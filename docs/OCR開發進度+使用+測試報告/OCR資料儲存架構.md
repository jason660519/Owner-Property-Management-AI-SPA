# OCR 資料儲存架構說明

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---


> OCR 解析完成後的 JSON 檔案儲存位置與資料流程

---

## 資料儲存位置總覽

OCR 解析完成的 JSON 資料會儲存在 **兩個地方**：

### 1. Supabase Storage（檔案儲存）📁

**路徑格式**:

```
supabase/storage/transcripts/{property_id}/{document_id}.json
```

**範例**:

```
transcripts/
├── a1b2c3d4-e5f6-7890-abcd-ef1234567890/  (property_id)
│   ├── doc001-uuid.json
│   ├── doc002-uuid.json
│   └── doc003-uuid.json
└── f9e8d7c6-b5a4-3210-fedc-ba0987654321/  (另一個 property_id)
    └── doc001-uuid.json
```

**用途**:

- 長期保存完整的 JSON 檔案
- 可下載查看原始資料
- 版本控制與備份
- 審計追蹤

---

### 2. Supabase Database（資料庫）💾

**表格**: `property_documents`

**欄位**:

- `ocr_result` (JSONB) - 完整的 Jason JSON 結構
- `json_storage_path` (TEXT) - Storage 中的檔案路徑

**同時更新**: `properties` 表的 `transcript_data` (JSONB)

**用途**:

- 快速查詢與檢索
- 支援 JSONB 查詢語法
- 關聯式查詢
- 即時更新與同步

---

## 完整資料流程

```
┌─────────────────┐
│  1. 上傳 PDF    │
│  (前端 App)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  2. Supabase Storage                    │
│     storage/property_pdfs/{uuid}.pdf    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  3. OCR Service 處理                    │
│     - PDF 前處理                        │
│     - OCR 文字辨識                      │
│     - 欄位解析                          │
│     - 生成 Jason JSON                   │
└────────┬────────────────────────────────┘
         │
         ├──────────────────────┬─────────────────────┐
         ▼                      ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ 4a. Storage      │  │ 4b. Database     │  │ 4c. Database    │
│  JSON 檔案       │  │  property_       │  │  properties     │
│                  │  │  documents       │  │                 │
│ transcripts/     │  │                  │  │ transcript_data │
│  {property_id}/  │  │ ocr_result       │  │ (JSONB)         │
│  {doc_id}.json   │  │ (JSONB)          │  │                 │
└──────────────────┘  └──────────────────┘  └─────────────────┘
         │                      │                     │
         └──────────────────────┴─────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  5. 前端 App 顯示     │
                    │     - 查詢資料        │
                    │     - 人工審核        │
                    │     - 欄位修正        │
                    └───────────────────────┘
```

---

## 詳細說明

### Step 1: 上傳 PDF

```typescript
// 前端上傳 PDF
const { data, error } = await supabase.storage
  .from('property_pdfs')
  .upload(`${propertyId}/${file.name}`, file);

// 建立 property_documents 記錄
const { data: doc } = await supabase.from('property_documents').insert({
  property_id: propertyId,
  agent_id: userId,
  file_name: file.name,
  file_type: 'pdf',
  storage_path: data.path,
  ocr_status: 'pending',
});
```

### Step 2-3: OCR 處理

```python
# OCR Service 處理
from src.preprocessor.pdf_preprocessor import PreprocessingPipeline
from src.models.jason_schema import TranscriptPayload

# 處理 PDF
pipeline = PreprocessingPipeline(dpi=300, enhance=True)
result = pipeline.process_page(pdf_path, page_num=0)

# 生成 Jason JSON
payload = TranscriptPayload(**parsed_data)
json_data = payload.model_dump()
```

### Step 4: 儲存結果

#### 4a. 儲存 JSON 檔案到 Storage

```python
import json
from supabase import create_client

# 初始化 Supabase
supabase = create_client(url, key)

# JSON 檔案路徑
json_path = f"transcripts/{property_id}/{document_id}.json"

# 上傳 JSON 到 Storage
json_bytes = json.dumps(json_data, ensure_ascii=False, indent=2).encode('utf-8')
supabase.storage.from_('transcripts').upload(
    json_path,
    json_bytes,
    file_options={"content-type": "application/json"}
)
```

#### 4b. 更新 property_documents 表

```python
# 更新文件記錄
supabase.table('property_documents').update({
    'ocr_status': 'completed',
    'ocr_result': json_data,
    'json_storage_path': json_path,
    'ocr_processed_at': datetime.now().isoformat()
}).eq('id', document_id).execute()
```

#### 4c. 同步更新 properties 表

```python
# 更新物件的 transcript_data
supabase.table('properties').update({
    'transcript_data': json_data
}).eq('id', property_id).execute()
```

---

## Storage Buckets 設定

需要建立以下 Storage buckets：

### 1. `property_pdfs` - 原始 PDF 檔案

```sql
-- Supabase Storage 設定
INSERT INTO storage.buckets (id, name, public)
VALUES ('property_pdfs', 'property_pdfs', false);

-- RLS 政策
CREATE POLICY "仲介可以上傳自己的 PDF"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property_pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. `transcripts` - OCR 結果 JSON

```sql
-- Supabase Storage 設定
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false);

-- RLS 政策
CREATE POLICY "OCR Service 可以寫入 transcripts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transcripts' AND
    auth.role() = 'service_role'
  );

CREATE POLICY "仲介可以讀取自己的 transcripts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transcripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 查詢範例

### 查詢特定物件的所有 OCR 結果

```sql
-- 查詢物件的所有文件
SELECT
  id,
  file_name,
  ocr_status,
  review_status,
  ocr_result,
  json_storage_path,
  created_at
FROM property_documents
WHERE property_id = '123e4567-e89b-12d3-a456-426614174000'
  AND ocr_status = 'completed'
ORDER BY created_at DESC;
```

### 使用 JSONB 查詢特定欄位

```sql
-- 查詢特定地號的物件
SELECT
  p.id,
  p.address,
  pd.ocr_result->'sections'->'basic'->>'build_register_number' as build_number,
  pd.ocr_result->'sections'->'area_summary'->>'total' as total_area
FROM properties p
JOIN property_documents pd ON p.id = pd.property_id
WHERE pd.ocr_result->'sections'->'basic'->'land_register_numbers' @> '["松山段一小段0100地號"]'::jsonb;
```

### 查詢需要審核的文件

```sql
-- 查詢待審核的 OCR 結果
SELECT
  pd.id,
  pd.property_id,
  p.address,
  pd.file_name,
  pd.ocr_result->'metadata'->>'confidence' as confidence,
  pd.created_at
FROM property_documents pd
JOIN properties p ON pd.property_id = p.id
WHERE pd.review_status = 'pending'
  AND pd.ocr_status = 'completed'
  AND (pd.ocr_result->'metadata'->>'confidence')::float < 0.8  -- 低信心分數
ORDER BY pd.created_at DESC;
```

---

## 資料庫 Schema 更新

需要執行以下 migration：

```bash
# 執行新的 migration
cd /Users/jason66/Owner\ Real\ Estate\ Agent\ SaaS
supabase db reset  # 重置資料庫（開發環境）

# 或應用單一 migration
supabase migration up
```

---

## Storage 管理建議

### 檔案命名規則

- **PDF 檔案**: `property_pdfs/{property_id}/{timestamp}_{original_name}.pdf`
- **JSON 檔案**: `transcripts/{property_id}/{document_id}.json`

### 檔案大小限制

- PDF: 最大 10MB
- JSON: 最大 1MB

### 備份策略

- Storage 自動備份（Supabase 內建）
- 資料庫每日備份
- JSON 檔案可以從 Database 的 JSONB 欄位重建

### 清理策略

```sql
-- 刪除 90 天前被拒絕的文件
DELETE FROM property_documents
WHERE review_status = 'rejected'
  AND reviewed_at < NOW() - INTERVAL '90 days';
```

---

## 前端整合範例

### 上傳並處理 PDF

```typescript
// 1. 上傳 PDF
const uploadPDF = async (file: File, propertyId: string) => {
  // 上傳到 Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property_pdfs')
    .upload(`${propertyId}/${Date.now()}_${file.name}`, file);

  if (uploadError) throw uploadError;

  // 建立文件記錄
  const { data: docData, error: docError } = await supabase
    .from('property_documents')
    .insert({
      property_id: propertyId,
      file_name: file.name,
      file_type: 'pdf',
      storage_path: uploadData.path,
      ocr_status: 'pending',
    })
    .select()
    .single();

  if (docError) throw docError;

  // 觸發 OCR 處理（Edge Function）
  await supabase.functions.invoke('process-ocr', {
    body: { document_id: docData.id },
  });

  return docData;
};
```

### 查詢 OCR 結果

```typescript
// 2. 查詢 OCR 結果
const getOCRResult = async (documentId: string) => {
  const { data, error } = await supabase
    .from('property_documents')
    .select('*, properties(*)')
    .eq('id', documentId)
    .single();

  if (error) throw error;

  return {
    status: data.ocr_status,
    result: data.ocr_result,
    jsonPath: data.json_storage_path,
  };
};
```

### 下載 JSON 檔案

```typescript
// 3. 下載完整 JSON 檔案
const downloadJSON = async (jsonPath: string) => {
  const { data, error } = await supabase.storage.from('transcripts').download(jsonPath);

  if (error) throw error;

  // 轉換為 JSON
  const text = await data.text();
  return JSON.parse(text);
};
```

---

## 總結

OCR 解析完成的 JSON 會儲存在：

1. **Supabase Storage** (`transcripts` bucket)
   - 路徑：`transcripts/{property_id}/{document_id}.json`
   - 用途：長期保存、下載、備份

2. **Supabase Database** (`property_documents` 表)
   - 欄位：`ocr_result` (JSONB)
   - 用途：快速查詢、關聯查詢

3. **Supabase Database** (`properties` 表)
   - 欄位：`transcript_data` (JSONB)
   - 用途：物件層級的快速存取

這種雙重儲存策略確保了：

- ✅ 資料安全（多重備份）
- ✅ 查詢效能（JSONB 索引）
- ✅ 檔案完整性（Storage 保存原始檔案）
- ✅ 靈活性（可以選擇查詢或下載）

---

**最後更新**: 2026-01-16
**相關文件**:

- `supabase/migrations/20260116000000_add_property_documents.sql`
- `docs/OCR規劃報告.md`
