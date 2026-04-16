# 尋人資料庫功能 — 開發規格書

**功能名稱**：尋人資料庫（People Database）  
**文檔版本**：1.2  
**建立日期**：2026/04/12  
**負責人**：Claude  
**狀態**：開發規格更新中（ID 132 規劃已補充）

---

## 變更紀錄（ID 131）

### 2026/04/13 - ID 132 精準搜尋與來源可追溯升級（規劃）

- 新增 ID 132 實作目標：修正電話/身分證查詢誤命中（exact-first）、來源追溯、匯入台帳可視化、多資料集勾選搜尋。
- 明確定義 dataset -> import_batch -> source_file -> person_record 的資料追溯鏈，作為大資料庫可營運的基礎模型。
- 補充前後端契約對齊方向：統一 `data_sources[]`、品質門檻、時間範圍與分頁參數。
- 本次僅更新規劃與規格，不包含功能實作與行為變更。

### 2026/04/12 - 單頁整合入口調整

- 將 `Tools` 的 people-db 入口收斂為單一卡片，避免同層分散到多個子入口（import / search）。
- `Tools` 頁面保留：
  - `尋人資料庫工具`（統一入口：`/superadmin/settings/people-database`）
  - 其他非 people-db 工具（例如 `FP 轉 PDF`）維持原樣
- `Tools` 頁面移除：
  - `people-db 匯入資料`
  - `people-db 搜尋介面`
- 使用者進入 `/superadmin/settings/people-database` 後，仍可繼續使用既有匯入與搜尋流程（整合入口，功能不刪減）。

---

## 一、功能概述

### 1.1 功能目標

支援超級管理員上傳、導入、搜尋臺灣尋人資料庫（包含里長名冊、企業名錄、學校名單等多元資料來源），使用 ElasticSearch 實現高效全文搜尋，提供資料品質管理與去重功能。

### 1.2 用戶角色

| 角色 | 權限 | 使用場景 |
| :--- | :--- | :--- |
| 超級管理員 | 上傳、搜尋、管理、去重、刪除 | 資料導入、查詢、品質維護 |
| 一般管理員 | 檢視、搜尋、報告 | 協助查詢、監控品質 |
| 其他角色 | 無權限（RLS 隔離） | — |

### 1.3 核心需求

- ✅ 支援多格式導入：Excel（XLS/XLSX）、PDF、TXT、CSV
- ✅ 自動欄位映射與資料清洗
- ✅ 模糊搜尋與組合篩選
- ✅ OCR 信心度追蹤
- ✅ 資料去重與品質評分
- ✅ 完整稽核日誌

---

## 二、系統架構

### 2.1 分層設計

```
┌─────────────────────────────────────────────────┐
│ 前端層 (Superadmin)                              │
├─────────────────┬───────────────────────────────┤
│ ImportPage      │ SearchPage     │  QualityPage │
├─────────────────────────────────────────────────┤
│ API Layer (Next.js Routes)                      │
├─────────────────┬───────────────────────────────┤
│ /api/people-db/ │ upload, search, stats, etc    │
├─────────────────────────────────────────────────┤
│ Backend Data Service                            │
├─────────────────┬───────────────────────────────┤
│ /import/people  │ /search/people, /stats        │
├─────────────────────────────────────────────────┤
│ 存儲層                                           │
├────────┬───────────────┬──────────────────────┤
│ ES     │ PostgreSQL    │ Storage (Bucket)     │
│ Index  │ Audit/Meta    │ Original Files       │
└────────┴───────────────┴──────────────────────┘
```

### 2.2 ElasticSearch 索引設計

**索引名**：`people_database`

**Mapping**：

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "ik_smart_analyzer": {
          "type": "custom",
          "tokenizer": "ik_smart",
          "filter": ["stconvert_filter", "lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "record_id": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "ik_smart_analyzer",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "id_number": {
        "type": "keyword"
      },
      "phone": {
        "type": "keyword"
      },
      "address": {
        "type": "text",
        "analyzer": "ik_smart_analyzer"
      },
      "organization": {
        "type": "keyword"
      },
      "title_position": {
        "type": "text",
        "analyzer": "ik_smart_analyzer"
      },
      "data_source": {
        "type": "keyword"
      },
      "import_batch_id": {
        "type": "keyword"
      },
      "ocr_confidence": {
        "type": "float"
      },
      "quality_score": {
        "type": "float"
      },
      "duplicate_flag": {
        "type": "keyword"
      },
      "created_at": {
        "type": "date"
      },
      "updated_at": {
        "type": "date"
      },
      "original_text": {
        "type": "text",
        "analyzer": "ik_smart_analyzer",
        "enabled": false
      }
    }
  }
}
```

### 2.3 PostgreSQL 表結構

**表名**：`people_records`

```sql
CREATE TABLE people_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id TEXT UNIQUE NOT NULL,
  import_batch_id UUID NOT NULL REFERENCES import_batches(id),
  
  -- 核心欄位
  name TEXT NOT NULL,
  id_number TEXT,
  phone TEXT,
  address TEXT,
  organization TEXT,
  title_position TEXT,
  
  -- 資料來源
  data_source TEXT NOT NULL, -- "台北市里長", "企業名錄", etc
  source_file_path TEXT,
  source_document_id TEXT,
  
  -- 品質指標
  ocr_confidence FLOAT DEFAULT 1.0,
  quality_score FLOAT DEFAULT 0.5,
  duplicate_flag TEXT, -- NULL | "pending_review" | "confirmed_duplicate"
  duplicate_of_id UUID REFERENCES people_records(id),
  
  -- 稽核欄位
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_import_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
);

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL, -- "台北市里長 2026-04-12"
  description TEXT,
  data_source TEXT NOT NULL,
  total_records INT,
  processed_records INT DEFAULT 0,
  skipped_records INT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending | processing | completed | failed | rolled_back
  error_message TEXT,
  
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE people_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_record_id UUID NOT NULL REFERENCES people_records(id),
  duplicate_record_id UUID NOT NULL REFERENCES people_records(id),
  similarity_score FLOAT,
  review_status TEXT DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(primary_record_id, duplicate_record_id)
);
```

---

## 三、功能模組

### 3.1 模組 A：資料導入 (Import)

**位置**：`superadmin/app/superadmin/settings/people-database/import/page.tsx`

**工作流**：

1. **檔案上傳面板**
   - 支援拖曳或點選上傳（多檔）
   - 檔案類型驗證：`.xls`, `.xlsx`, `.pdf`, `.txt`, `.csv`
   - 顯示檔案大小、預計處理時間
   - 上傳上限：單檔 100MB，單次批次 500MB

2. **欄位映射**
   - 自動偵測首列是否為 header（提示用戶確認）
   - 使用者手動拖曳方式指定：
     ```
     Name ← Excel: Column A
     ID Number ← Excel: Column B
     Phone ← Excel: Column C
     Address ← Excel: Column D
     ```
   - 顯示前 5 行預覽
   - 支援「預設映射範本」下拉選單

3. **資料清洗預覽**
   - 顯示「檢測到 X 筆可能重複記錄」
   - 按信心度排序（高 → 低）
   - 支援「跳過」、「合併」、「保留」三種決策
   - 顯示原始值 vs 清洗後值的對比

4. **確認與提交**
   - 批次標籤（必填）：「台北市里長 2026-04-12」
   - 資料來源選擇（必填）
   - 備註（可選）
   - 預計 XX 秒處理 XX 筆記錄
   - 提交後進入「進行中」狀態，實時顯示進度

5. **完成頁面**
   - ✅ 成功：顯示導入統計
     ```
     成功 980 筆 ✓
     跳過 20 筆（重複）
     耗時 45 秒
     ```
   - ❌ 失敗：顯示錯誤原因 + 「下載錯誤報告」按鈕
   - 提供「回滾此批次」按鈕（管理員專用）

**API 端點**：

```typescript
POST /api/people-db/import/preview
// Request: { files: File[], dataSource: string }
// Response: { preview: PreviewRow[], stats: ImportStats, warnings: string[] }

POST /api/people-db/import/submit
// Request: { 
//   importBatchLabel: string, 
//   dataSource: string,
//   fieldMapping: FieldMapping,
//   decisions: MappingDecision[] // 去重決策
// }
// Response: { batchId: string, status: "processing" }

GET /api/people-db/import/status/:batchId
// Response: { status, processed, total, progress: %, eta: number }

POST /api/people-db/import/rollback/:batchId
// Response: { success: boolean, rolledBackCount: number }
```

---

### 3.2 模組 B：全文搜尋 (Search)

**位置**：`superadmin/app/superadmin/settings/people-database/search/page.tsx`

**搜尋界面**：

1. **主搜尋框**
   - 多欄位模糊搜尋（姓名、身份證字號、電話、地址）
   - 實時建議（autocomplete）基於搜尋歷史
   - 支援高級語法（年度內迭代）

2. **篩選器面板**（側邊欄）
   - **資料來源**：多選勾選框（「台北市里長」、「企業名錄」、「學校名單」）
   - **匯入時間**：日期範圍選擇
   - **品質分數**：滑桿（0.0–1.0，預設 ≥ 0.5）
   - **OCR 信心度**：滑桿（0.0–1.0，預設 ≥ 0.8）
   - **排除重複**：勾選框（自動篩除 duplicate_flag = "confirmed_duplicate"）

3. **搜尋結果表**
   - 分頁：預設 20 筆/頁，可改 50/100
   - 欄位：姓名、身份證字號、電話、地址、組織、職位、資料來源、品質分數、相似度分數
   - 排序：相似度（預設）、導入時間、品質分數
   - 高亮：搜尋關鍵字用 `<mark>` 標籤

4. **詳情彈窗**（BottomSheetTabs）
   - **基本資訊**：所有欄位呈現
   - **來源追蹤**：指向原始檔案、OCR 信心度、清洗過程
   - **重複檢測**：如有疑似重複，顯示相關記錄列表 + 相似度分數
   - **稽核日誌**：誰在何時做了什麼操作

**搜尋邏輯**：

```typescript
interface SearchQuery {
  q?: string // 模糊搜尋文本
  filters?: {
    dataSources?: string[]
    importedFromDate?: ISO8601Date
    importedToDate?: ISO8601Date
    minQualityScore?: number // 0–1
    minOcrConfidence?: number // 0–1
    excludeDuplicates?: boolean
  }
  sortBy?: "relevance" | "imported" | "quality" // 預設 relevance
  limit: number // 20, 50, 100
  offset: number
}

// ElasticSearch Bool Query (偽代碼)
{
  "bool": {
    "must": [
      { "multi_match": { "query": q, "fields": ["name^2", "id_number", "phone", "address"] } }
    ],
    "filter": [
      { "terms": { "data_source.keyword": filters.dataSources } },
      { "range": { "created_at": { "gte": importedFromDate } } },
      { "range": { "quality_score": { "gte": minQualityScore } } },
      { "must_not": { "exists": { "field": "duplicate_flag" } } }
    ]
  }
}
```

---

### 3.3 模組 C：資料品質 (Quality)

**位置**：`superadmin/app/superadmin/settings/people-database/quality/page.tsx`

**品質評分算法**：

```typescript
qualityScore = (validFieldsCount / totalFieldCount) 
             * ocrConfidence 
             * recencyWeight
             * (1 - duplicatePenalty)

// 舉例：
// - 有 4/6 欄位 (0.67)
// - OCR 信心度 0.95
// - 導入不超過 1 年 (weight: 1.0)
// - 非重複 (penalty: 0)
// = 0.67 * 0.95 * 1.0 * 1.0 = 0.637 (Medium)
```

**品質等級**：
- 🟢 **High**：≥ 0.85
- 🟡 **Medium**：0.5–0.85
- 🔴 **Low**：< 0.5

**品質管理頁面**：

1. **統計儀表板**
   - 總記錄數、High/Medium/Low 分佈圓餅圖
   - 重複記錄數、待審核數
   - 資料來源排行
   - 平均 OCR 信心度趨勢圖

2. **記錄列表**
   - 按品質分數排序（預設 Low 優先）
   - 欄位：記錄編號、名稱、品質分數、重複標記、操作
   - 操作：「詳情」、「標記重複」、「修正」、「刪除」

3. **去重工具**
   - **自動偵測**：用 `more_like_this` query 找疑似重複
   - 顯示配對列表：主記錄 ↔ 疑似重複（相似度分數）
   - 人工決策：
     ```
     ✓ 確認重複 → primary/duplicate 標記，計入 duplicates 表
     ✗ 否認 → 記錄決策，減少誤判
     ⏸ 延後審核
     ```
   - 進度追蹤：「20 / 100 待審核」

4. **資料修正**
   - 支援在線編輯欄位（超管專用）
   - 修改紀錄留下時間戳與操作者
   - 修改後自動重建 ES 索引

---

### 3.4 模組 D：索引管理 (Index Management)

**位置**：`superadmin/app/superadmin/settings/people-database/index/page.tsx`

**功能**：

1. **索引狀態面板**
   - 索引名 / 狀態 / 文件數 / 磁碟占用 / 最後更新時間
   - 顯示 Elasticsearch 叢集狀態（Green/Yellow/Red）

2. **手動操作**
   - 🔄 **重新索引全部** (Reindex All)
     - 確認對話：「將重建 10,000 筆記錄，耗時約 30 秒，期間搜尋可用」
     - 後台執行，進度實時顯示
   - 🗑️ **刪除批次索引**
     - 選擇待刪除批次
     - 相關記錄被標記為 "archived"，不出現在搜尋結果
   - 📊 **分析索引**
     - 顯示磁碟占用、分片配置、複本設定

3. **定期維護**
   - 排程：每週一 03:00 自動重建
   - 保留最近 90 天資料，更舊的自動歸檔

---

## 四、技術實現細節

### 4.1 檔案處理

**工具鏈**：

| 格式 | 工具 | 流程 |
| :--- | :--- | :--- |
| `.xlsx` / `.xls` | `exceljs` | JS 直接解析，提取表格 |
| `.pdf` | `pdfjs` | 無文本 PDF 用 OCR；有文本用 PDFExtractor |
| `.txt` | 原生 | 分行、正則分隔符 |
| `.csv` | `csv-parser` | Node.js 流式解析 |

**欄位提取邏輯**：

```typescript
interface FieldMapping {
  nameColumn: string | number // "A" or 0
  idNumberColumn?: string | number
  phoneColumn?: string | number
  addressColumn?: string | number
  organizationColumn?: string | number
  positionColumn?: string | number
}

// 處理流程
1. 檔案讀取 → 原始行數據
2. 欄位提取 → 按 mapping 提取信息
3. 資料清洗 → 去空白、標準化電話號碼、地址正規化
4. 去重檢查 → 與現有 ES 索引比對
5. 臨時存儲 → PostgreSQL staging 表
6. 批量寫入 → ES + 移動至 people_records
```

### 4.2 OCR 與信心度

**信心度計算**：

```python
# Backend confidence scoring service（已下線）
confidence_score = (
    field_extraction_confidence  # OCR 引擎評分
    * field_validity_score       # 欄位內容合理性（如電話格式）
    * source_file_quality        # PDF 清晰度 / Excel 完整性
)
```

**掉線場景**：

- Excel：直接提取，confidence = 1.0（無 OCR）
- PDF 有文本：提取，confidence = 0.95
- PDF 無文本：OCR，confidence = 模型評分（通常 0.7–0.9）
- TXT：直接提取，confidence = 0.9

### 4.3 安全與隱私

**RLS 政策**：

```sql
-- 只有超管能查看
CREATE POLICY "Superadmin only" ON people_records
  FOR SELECT USING (auth.role() = 'superadmin');

CREATE POLICY "Superadmin only insert" ON people_records
  FOR INSERT WITH CHECK (auth.role() = 'superadmin');
```

**敏感資訊處理**：

- 身份證字號：只有超管能檢視（UI 上預設隱藏，需點擊「顯示」）
- 電話：記錄日誌「誰在何時查看」
- 操作稽核：所有修改、刪除都要 Supabase 稽核表記錄

---

## 五、整合點

### 5.1 UI 導覽整合

```tsx
// superadmin/components/layout/Sidebar.tsx
navItems: [
  // ... 現有項目
  {
    label: '尋人資料庫',
    icon: <Users className="w-4 h-4" />,
    href: '/superadmin/settings/people-database',
    children: [
      { label: '上傳資料', href: '/superadmin/settings/people-database/import' },
      { label: '搜尋', href: '/superadmin/settings/people-database/search' },
      { label: '資料品質', href: '/superadmin/settings/people-database/quality' },
      { label: '管理索引', href: '/superadmin/settings/people-database/index' },
    ]
  }
]
```

### 5.2 複用元件

- `SearchInput`：搜尋輸入框
- `EnhancedTable`：結果表格（見 `enhanced-table-guide.md`）
- `BottomSheetTabs`：詳情彈窗
- `Badge` / `Progress`：狀態視覺化

---

## 六、非功能需求

| 需求 | 標準 |
| :--- | :--- |
| **搜尋性能** | 10,000 筆記錄內 < 500ms |
| **匯入速度** | 1,000 筆/秒 |
| **儲存容量** | 初期 100 萬筆（ES + PG 共 ~50GB） |
| **可用性** | 99.5% uptime（排除維護） |
| **合規性** | GDPR / 臺灣個資法（稽核、刪除權） |
| **可轉移性** | 支援 CSV 匯出 |

---

## 七、實裝優先級

### Phase 1（第 1–2 週）：核心導入與搜尋

- ✅ Import 模組（檔案上傳 + 欄位映射）
- ✅ Search 模組（基本全文搜尋）
- ✅ ElasticSearch 索引建立
- ✅ PostgreSQL 表結構
- ✅ RLS 政策

### Phase 2（第 3 週）：品質管理

- ✅ Quality 模組（評分 + 去重）
- ✅ 自動重複偵測
- ✅ 人工審核 UI

### Phase 3（第 4 週）：索引管理 + 優化

- ✅ Index 管理模組
- ✅ 定期維護排程
- ✅ 效能優化（快取、批次操作）

---

## 八、未來擴展

- 雲端資料夾同步（Google Drive / Dropbox）
- 資料源與 CRM 整合（自動補充聯絡方式）
- 地址地理編碼（經緯度）
- 進階分析：社交網絡圖分析、人口統計

---

## 九、ID 132 實作範圍（待你審閱後執行）

### 9.1 P0（先做，直接解決目前痛點）

1. 查詢策略升級：電話與身分證改為 exact-first，姓名/地址維持全文檢索
2. 契約一致化：前端與 FastAPI `/search` 參數完全對齊
3. 來源追溯欄位：結果表可見資料集、批次、匯入時間、原始檔名/來源
4. 匯入台帳：顯示何時匯入、誰匯入、匯入幾筆、成功/失敗/跳過
5. 搜尋範圍控制：多資料集勾選（全選/反選）

### 9.2 P1（第二階段）

1. 來源詳情抽屜（含 source_file_path/source_document_id）
2. 搜尋結果 explain / 命中原因標示
3. 批次回滾與資料集停用策略

### 9.3 成功標準

- 查詢 `27851310` 不再返回與電話無關記錄
- 身分證與電話查詢 Top 1 命中率顯著提升
- User 可在 UI 明確知道每筆資料來源與匯入上下文
- User 可限制只搜特定資料集，避免跨資料集污染

