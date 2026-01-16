# OCR JSON 儲存位置快速參考

## 📍 簡答：JSON 放在兩個地方

### 1️⃣ Supabase Storage（檔案系統）

```
路徑: storage/transcripts/{property_id}/{document_id}.json

範例:
storage/transcripts/
  └── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
      └── doc-uuid-123.json    ← JSON 檔案在這裡
```

### 2️⃣ Supabase Database（資料庫）

```sql
-- property_documents 表
{
  id: "doc-uuid-123",
  property_id: "a1b2c3d4-...",
  ocr_result: { ... },              ← JSON 資料在這裡（JSONB 格式）
  json_storage_path: "transcripts/..." ← 指向 Storage 的路徑
}

-- properties 表
{
  id: "a1b2c3d4-...",
  transcript_data: { ... }          ← 同步更新的 JSON 資料
}
```

---

## 🔄 完整流程（5 步驟）

```
1. 上傳 PDF
   ↓
   storage/property_pdfs/{property_id}/file.pdf

2. OCR 處理
   ↓
   backend/ocr_service 解析

3. 生成 JSON
   ↓
   Jason JSON 格式

4. 雙重儲存
   ├─→ storage/transcripts/{property_id}/{doc_id}.json  (檔案)
   └─→ property_documents.ocr_result                     (資料庫)

5. 同步更新
   └─→ properties.transcript_data                        (資料庫)
```

---

## 💡 為什麼要雙重儲存？

| 儲存位置     | 優點                                     | 用途                                   |
| :----------- | :--------------------------------------- | :------------------------------------- |
| **Storage**  | • 完整保存<br>• 可下載<br>• 版本控制     | • 長期備份<br>• 審計追蹤<br>• 原始資料 |
| **Database** | • 快速查詢<br>• 關聯查詢<br>• JSONB 索引 | • 即時查詢<br>• 資料分析<br>• 前端顯示 |

---

## 📝 實際路徑範例

假設處理了一份建物謄本：

```
Property ID: 550e8400-e29b-41d4-a716-446655440000
Document ID: 123e4567-e89b-12d3-a456-426614174000
```

### Storage 路徑

```
storage/transcripts/
  └── 550e8400-e29b-41d4-a716-446655440000/
      └── 123e4567-e89b-12d3-a456-426614174000.json
```

### Database 記錄

```sql
-- property_documents 表
SELECT * FROM property_documents
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

結果:
{
  id: "123e4567-e89b-12d3-a456-426614174000",
  property_id: "550e8400-e29b-41d4-a716-446655440000",
  file_name: "建物謄本.pdf",
  ocr_status: "completed",
  ocr_result: {
    metadata: { ... },
    sections: { ... }
  },
  json_storage_path: "transcripts/550e8400.../123e4567....json"
}
```

---

## 🚀 如何使用

### 查詢 JSON（推薦：從 Database）

```typescript
// 快速查詢（使用 Database）
const { data } = await supabase
  .from('property_documents')
  .select('ocr_result')
  .eq('id', documentId)
  .single();

console.log(data.ocr_result); // 立即取得 JSON
```

### 下載 JSON（完整檔案）

```typescript
// 下載完整檔案（從 Storage）
const { data: doc } = await supabase
  .from('property_documents')
  .select('json_storage_path')
  .eq('id', documentId)
  .single();

const { data: file } = await supabase.storage.from('transcripts').download(doc.json_storage_path);

const json = await file.text();
console.log(JSON.parse(json));
```

---

## 🔧 設置步驟

### 1. 執行 Migration

```bash
cd /Users/jason66/Owner\ Real\ Estate\ Agent\ SaaS
supabase migration up
```

### 2. 建立 Storage Buckets

在 Supabase Dashboard：

1. 前往 Storage
2. 建立 `property_pdfs` bucket (private)
3. 建立 `transcripts` bucket (private)

### 3. 設定 RLS 政策

已包含在 migration 中，會自動建立。

---

## 📊 資料流向圖

```
┌─────────┐
│ 前端 App │
└────┬────┘
     │ 上傳 PDF
     ▼
┌─────────────────┐
│ Supabase Storage│  storage/property_pdfs/
└────┬────────────┘
     │
     ▼ 觸發 OCR
┌─────────────────┐
│  OCR Service    │  backend/ocr_service
└────┬────────────┘
     │ 生成 JSON
     │
     ├──────────────────────┬───────────────────┐
     ▼                      ▼                   ▼
┌────────────┐    ┌──────────────────┐  ┌─────────────┐
│  Storage   │    │ property_        │  │ properties  │
│            │    │ documents        │  │             │
│ JSON 檔案  │    │ ocr_result       │  │ transcript_ │
│            │    │ (JSONB)          │  │ data        │
└────────────┘    └──────────────────┘  └─────────────┘
     │                      │                   │
     └──────────────────────┴───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ 前端查詢/顯示 │
                    └───────────────┘
```

---

## ❓ 常見問題

### Q1: 為什麼不只存 Database？

**A**: Storage 提供長期備份、版本控制、審計追蹤。Database 可能因更新而修改，Storage 保留原始資料。

### Q2: 查詢時應該用哪個？

**A**:

- **日常查詢**：使用 Database（更快）
- **下載原始檔案**：使用 Storage
- **資料修正後重新處理**：從 Storage 讀取

### Q3: 如果兩者不一致怎麼辦？

**A**: 以 Storage 的檔案為準（原始資料），可以重新同步到 Database。

### Q4: Storage 會不會太佔空間？

**A**:

- 單個 JSON 約 2-5KB
- 1000 份文件約 2-5MB
- 可設定定期清理被拒絕的文件

---

## 📚 相關文件

- 📄 [OCR資料儲存架構.md](./OCR資料儲存架構.md) - 詳細技術文檔
- 📄 [OCR規劃報告.md](./OCR規劃報告.md) - 完整規劃
- 📄 [Migration](../supabase/migrations/20260116000000_add_property_documents.sql) - 資料庫 Schema

---

**最後更新**: 2026-01-16
