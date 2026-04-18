# 尋人資料庫 — 樹狀資料來源管理 + 進階關聯分析（Row 144）開發規格書

**功能名稱**：People Database — Dataset Tree & Advanced Relations
**Row ID**：144
**文檔版本**：1.0
**建立日期**：2026/04/17
**負責人**：Claude Opus 4.7
**狀態**：In Progress（設計完成、等待實作 Sprint 1）
**相依**：Row 131（People Database Phase 1）、Row 132（精準搜尋與來源可追溯）

---

## 一、背景與目標

### 1.1 問題陳述

Row 131 與 132 已建立 people-db 基礎（ES 索引 + FastAPI + 單頁工作區 + 多資料集勾選 + 來源追溯）。使用者目前仍有四個核心缺口：

1. **資料來源以平鋪 checkbox 顯示**：使用者擁有的 `/Volumes/KLEVV-4T-2/台灣尋人資料庫` 實體資料夾有 30+ 個子集（例：`北市稅籍/2013大安區`、`企業名錄/三萬企業`），層級結構在 UI 上完全看不出來。
2. **Import 僅有扁平 `data_source` 字串**：上傳整個資料夾時無法保留子目錄層級，日後無法「只搜尋某個主來源下的某個子資料夾」。
3. **無資料來源管理介面**：無法重新命名、合併、停用、收藏已匯入的 dataset，導致資料越堆越亂。
4. **無進階關聯查詢**：無法由「人」反查「持有房產」或「親友關係」，這是使用者聲明的真正業務目標。

### 1.2 使用者目標

- **找到正確且對的人**：以姓名/電話/身分證/地址任一條件命中，並能交叉驗證（同一人出現在多個來源 → 可信度提升）。
- **反向查詢房產**：由身分證號查詢此人在 `properties` 表中持有/交易過的所有不動產。
- **關係推論**：同戶籍地址、同電話前綴、同公司、房產交易對手 → 推論潛在家人/朋友關係圖譜。

### 1.3 非目標（本 Row 不做）

- OCR pipeline 重構（屬 Row 131 Phase 2）
- 向量搜尋（已列為 Row 131 第二階段）
- 正式生產叢集 ILM（屬於運維階段）

---

## 二、系統架構變更

### 2.1 資料模型新增欄位

**ES `people_database` 索引 mapping 擴充**：

```json
{
  "mappings": {
    "properties": {
      "dataset_root":    { "type": "keyword" },
      "dataset_subpath": { "type": "keyword" },
      "dataset_path":    { "type": "keyword" },
      "address_normalized": { "type": "keyword" },
      "address_tokens":     { "type": "keyword" }
    }
  }
}
```

- `dataset_root`：主資料來源（例：`企業名錄`、`北市稅籍`、`台北市里長`）
- `dataset_subpath`：子路徑（例：`2012/三萬企業`、`2013大安區`）
- `dataset_path`：`{dataset_root}/{dataset_subpath}`，供 prefix filter 用
- `address_normalized`：地址正規化後字串（市/縣/區/里/路/段/巷/弄/號）
- `address_tokens`：地址拆解 tokens（供反查「誰住在這條路」）

**Postgres `dataset_metadata` 新表**：

```sql
CREATE TABLE dataset_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_path TEXT NOT NULL UNIQUE,
  display_name TEXT,
  favorited BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  emoji TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS：僅 super_admin 可讀寫。

### 2.2 新 API endpoints

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/v1/people-db/dataset-tree` | 樹狀 JSON（含 count、last_imported_at、quality_avg、enabled、favorited） |
| PATCH | `/api/v1/people-db/datasets/{id}` | 重新命名 / 收藏 / 啟停 |
| POST | `/api/v1/people-db/datasets/merge` | 合併兩個 dataset（rewrite ES `data_source`） |
| POST | `/api/v1/people-db/datasets/split` | 依 batch_id 拆分 dataset |
| GET | `/api/v1/people-db/people/{id_number}/properties` | 反查此人持有房產（join `properties` 表） |
| GET | `/api/v1/people-db/people/{id_number}/relations` | 親友關係圖譜（含推論依據） |

### 2.3 前端變更

**`apps/superadmin/app/superadmin/settings/people-database/search/page.tsx`**
左右分割：左側 sticky 樹狀資料來源面板（280px），右側搜尋結果。

**新增 `apps/superadmin/app/superadmin/settings/people-database/sources/page.tsx`**
Dataset 管理頁（重新命名 / 合併 / 啟停 / 收藏）。

**新增 `apps/superadmin/app/superadmin/settings/people-database/person/[id]/page.tsx`**
單人詳情頁（含交叉來源比對、持有房產、親友圖譜）。

**Import 流程擴充**（`import/page.tsx`）
- 上傳資料夾時，自動從 `webkitRelativePath` 推斷 `dataset_root` + `dataset_subpath`
- UI 新增兩欄表單可覆寫推斷結果

---

## 三、驗收條件（Acceptance Criteria）

1. 搜尋頁左側顯示樹狀資料來源面板，節點可展開/收合，每節點顯示筆數、最後匯入時間、品質分數、大小警告。
2. 預設「最近使用」prefilled，而非「全選」；可切換「收藏」preset。
3. 勾選父節點 = 自動涵蓋所有子節點（ES 以 `dataset_path` prefix filter 實現）。
4. 底部即時顯示「將搜尋的來源數 / 總筆數」提示，並在超過 500K 筆時顯示「越少越快」警示。
5. Dataset 管理頁可重新命名、合併、拆分、啟停、收藏；操作後 ES 與 Postgres 同步更新。
6. Import 流程可保留資料夾層級，同一資料夾多次匯入 = 同一 `dataset_path`。
7. 單人詳情頁顯示：身分證反查到的所有房產（≥ 1 筆時）、同戶籍地址他人（≥ 1 筆時）。
8. 所有新 API 有整合測試覆蓋；前端樹狀面板與 Dataset 管理頁有 E2E 覆蓋。

---

## 四、實作分期

| Sprint | 範圍 | 預估工時 |
|---|---|---|
| Sprint 1 | 左側樹狀面板 + `/dataset-tree` endpoint + mapping 擴充 | 1–2 天 |
| Sprint 2 | Dataset 管理頁 + Import dataset_root/subpath 支援 | 2–3 天 |
| Sprint 3 | 地址正規化 + 房產反查 API + 單人詳情頁 | 3–4 天 |
| Sprint 4 | 親友關係圖譜（推論 + 視覺化） | 5–7 天 |

---

## 五、風險與待釐清

- **ES reindex 成本**：新增 `dataset_path` 與 `address_normalized` 需要 reindex 現有文件，大資料量場景下應以 `_update_by_query` + pipeline 分批執行。
- **地址正規化字典**：台灣地址格式多樣，需決定採自建規則 or 引入外部服務。
- **關係圖譜推論精度**：同戶籍/同電話前綴可能誤匹配，需要信心分數閾值控制。
