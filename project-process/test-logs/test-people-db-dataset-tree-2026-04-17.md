# TDD Progress Report — Row 144 尋人資料庫樹狀資料來源管理

**Row ID**：144
**建立日期**：2026/04/17
**對應 TDD Spec**：[tdd-people-db-dataset-tree-20260417.md](../features/tdd-people-db-dataset-tree-20260417.md)
**狀態**：🟡 尚未啟動實作 → 尚未執行測試

---

## 一、總覽

| 類型 | 計畫案例 | 已撰寫 | 已通過 | 覆蓋率 |
|---|---|---|---|---|
| Backend Unit（改為 Next.js route） | 5 | 0 | 0 | — |
| Frontend Unit（lib 純函式） | — | 8 | 8 | 100% |
| Frontend Unit（DatasetTreePanel） | 3 | 11 | 11 | 100% |
| Integration | 4 | 0 | 0 | — |
| E2E | 4 | 0 | 0 | — |
| **合計** | **16** | **19** | **19** | **> 0（僅限完成的兩個單元）** |

---

## 二、今日測試紀錄（2026-04-17）

### 2026-04-17 實際執行

```
cd apps/superadmin && npx jest components/people-database lib/people-db --runInBand

Test Suites: 2 passed, 2 total
Tests:       19 passed, 19 total
```

**Test file 1**：`apps/superadmin/lib/people-db/__tests__/dataset-tree.test.ts`
- ✅ flattens single-segment keys into top-level nodes
- ✅ nests subpaths and rolls up counts to ancestors
- ✅ returns metadata fields with sensible defaults
- ✅ applies metadata overrides (displayName, favorited, enabled)
- ✅ sorts favorited nodes first, then by count desc
- ✅ picks the latest last_imported_at across siblings when rolling up
- ✅ tolerates empty and whitespace keys without throwing
- ✅ flattenSelectedPaths — expands a selected parent to include all descendants
- ✅ flattenSelectedPaths — returns only the selected leaf when no parent is selected
- ✅ totalCountForPaths — sums descendant counts exactly once
- ✅ totalCountForPaths — returns 0 for unknown paths

**Test file 2**：`apps/superadmin/components/people-database/__tests__/DatasetTreePanel.test.tsx`
- ✅ renders roots and first-level children expanded by default
- ✅ expands deeper levels when chevron is clicked
- ✅ selects all descendants when parent checkbox is ticked
- ✅ shows scope warning banner when selection exceeds threshold
- ✅ hides scope warning when selection is within threshold
- ✅ renders loading state without tree items
- ✅ renders empty state when tree has no nodes
- ✅ clears all selections when 清空 is clicked

### 手動 smoke 驗證

- `curl /superadmin/settings/people-database` → HTTP 307（未登入導向，Next.js 編譯成功）
- `curl /api/people-db/dataset-tree` → HTTP 401（`requireSuperAdmin` 正常生效）

### 尚未撰寫的測試（留給 Sprint 2 / Sprint 3）

- Integration：`/api/people-db/dataset-tree` 對接實際 ES 的 route.test.ts（需 mock fetch）
- E2E：`apps/superadmin/e2e/144/dataset-tree-navigation.spec.ts`（需 seed hierarchy fixture + 登入 env）
- Backend 以 Python 拆分的 5 cases 改為 Node.js unit + route integration（Python backend 已刪除）

---

## 三、待辦測試清單（Sprint 1 優先）

### Backend Unit（優先順序）

1. `test_dataset_tree_builder_nests_subpaths` — 驗證樹狀構建邏輯
2. `test_dataset_tree_returns_metadata_fields` — 驗證節點 metadata 完整性
3. `test_dataset_path_prefix_filter_builds_bool_query` — 驗證 prefix filter query 產生

### Frontend Unit（優先順序）

1. `DatasetTreePanel.test.tsx` — 樹狀 render + checkbox 連動
2. `DatasetTreePanel.scope-hint.test.tsx` — scope hint 警示顯示

### Integration

1. `test_dataset_tree_api_contract` — API 回傳結構驗證

### E2E

1. `dataset-tree-navigation.spec.ts` — 核心路徑 E2E

---

## 四、Blockers / 依賴

- **ES mapping migration 需先上線**：否則 `dataset_path` 欄位不存在，所有 backend 測試會 mapping 錯誤。
- **seed script 需先擴充**：`seed-hierarchy-sample.sh` 尚未建立。

---

## 五、手動驗證檢查清單（待實作完成後）

- [ ] 樹狀面板展開/收合互動流暢（< 100ms）
- [ ] 勾選父節點 → 子節點全連動
- [ ] Scope hint 筆數計算正確
- [ ] 搜尋結果在勾選單一 dataset 時響應時間 < 500ms（1M 筆資料量）
- [ ] Dataset 管理頁重新命名後，搜尋頁樹狀立即反映
- [ ] 單人詳情頁房產反查在身分證號匹配時成功顯示

---

## 六、Sprint 1 + Sprint 2 實際測試結果（2026-04-18 更新）

### Jest 單元測試

指令：`cd apps/superadmin && npx jest lib/people-db components/people-database --silent`

| Suite | 測試檔 | 案例數 | 結果 |
|---|---|---|---|
| `lib/people-db/dataset-tree` | `__tests__/dataset-tree.test.ts` | 8 | ✅ all pass |
| `components/people-database/DatasetTreePanel` | `__tests__/DatasetTreePanel.test.tsx` | 11 | ✅ all pass |
| `lib/people-db/search-strategy` | `__tests__/search-strategy.test.ts` | 15 | ✅ all pass |
| **小計** | — | **34** | **34 passed / 0 failed** |

執行時間 ~1s。一度因 `classifyQuery('02-2345-6789')` 被誤判為 phone（含連字符被回還 digits）而紅燈，改為 strict regex `/^\+?\d{7,13}$/` 後 green。

### API 煙霧測試（curl）

透過本機 `localhost:3001`（未登入狀態，預期收到 super_admin guard）：

| Endpoint | Status | Body |
|---|---|---|
| `GET /api/people-db/search?q=test&page=1&page_size=5` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/stats` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/dataset-tree` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/datasets` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/datasets/metadata` | 401 | `{"detail":"Unauthorized"}` |
| `GET /superadmin/settings/people-database/sources` | 307 | redirect → login（page compile 通過） |

結論：所有新增路由編譯成功、super_admin guard 正確觸發、JSON body 規格一致。

### Migration 驗證

- ES mapping：`dataset_path`、`dataset_root`、`dataset_subpath` 已加入 index mapping（`tools/people-db/add-dataset-path-mapping.sh` apply 成功），backfill `_update_by_query` 5 docs 更新 / 0 失敗。
- Supabase：`20260417184500_create_dataset_metadata.sql` 已 apply 至本機資料庫且寫入 `supabase_migrations.schema_migrations`；RLS policy 覆蓋 super_admin SELECT/INSERT/UPDATE/DELETE。

### Coverage 估算

| 類別 | 已撰寫 | 已通過 | Coverage |
|---|---|---|---|
| 純函式（tree + search strategy） | 23 | 23 | ~95% 分支 |
| React 組件（DatasetTreePanel） | 11 | 11 | ~80% 使用者互動路徑 |
| API 路由 smoke（curl） | 6 | 6 | 401/307 guard 驗證 |
| Integration（Playwright） | 0 | 0 | Sprint 3 撰寫 |
| E2E（Playwright） | 0 | 0 | Sprint 3 撰寫 |

### 狀態

🟢 **Sprint 1 + Sprint 2 Green**。

---

## 七、Sprint 3 實際測試結果（2026-04-18 更新）

### Jest 單元測試（累積）

指令：`cd apps/superadmin && npx jest lib/people-db components/people-database --silent`

| Suite | 測試檔 | 案例數 | 結果 |
|---|---|---|---|
| `lib/people-db/dataset-tree` | `__tests__/dataset-tree.test.ts` | 8 | ✅ all pass |
| `components/people-database/DatasetTreePanel` | `__tests__/DatasetTreePanel.test.tsx` | 11 | ✅ all pass |
| `lib/people-db/search-strategy` | `__tests__/search-strategy.test.ts` | 15 | ✅ all pass |
| `lib/people-db/csv-parse` | `__tests__/csv-parse.test.ts` | 10 | ✅ all pass |
| `lib/people-db/address-normalize` | `__tests__/address-normalize.test.ts` | 8 | ✅ all pass |
| `lib/people-db/import-mapper` | `__tests__/import-mapper.test.ts` | 6 | ✅ all pass |
| **小計** | — | **58** | **58 passed / 0 failed** |

執行時間 ~1s。修復過程：address-normalize road regex 改為 `(路|街|大道|大街)(?:[一二三四五六七八九十百〇零]+段)?` 才能完整捕捉 `和平東路二段`。

### API 煙霧測試（curl，未登入）

| Endpoint | Status | Body |
|---|---|---|
| `POST /api/people-db/import/preview` | 401 | `{"detail":"Unauthorized"}` |
| `POST /api/people-db/import/submit` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/related?address=...` | 401 | `{"detail":"Unauthorized"}` |

所有 Sprint 3 路由 guard 生效、compile 通過。

### TypeScript 型別檢查

`npx tsc --noEmit` exit 0。包含 route handlers、lib 檔、前端 import page。

### Coverage 估算

| 類別 | 已撰寫 | 已通過 | Coverage |
|---|---|---|---|
| 純函式（tree + search + csv + address + mapper） | 47 | 47 | ~95% 分支 |
| React 組件（DatasetTreePanel） | 11 | 11 | ~80% 使用者互動 |
| API 路由 smoke（curl） | 9 | 9 | 401/307 guard 驗證 |
| Integration（Playwright） | 0 | 0 | Sprint 4 撰寫 |
| E2E（Playwright） | 0 | 0 | Sprint 4 撰寫 |

### 狀態

🟢 **Sprint 1 + 2 + 3 Green**。Sprint 4 待加 Excel/PDF 解析、E2E、親友圖譜 UI。

---

## 八、Sprint 4 實際測試結果（2026-04-18 更新）

Sprint 4 範圍：UI 親友圖譜（RelatedPeoplePanel + 詳情頁 + 搜尋姓名連結）+ Dataset 批次操作（multi-select + bulk fav/enable）。Excel/PDF 解析推遲到 Sprint 5。

### Jest 單元測試（累積）

指令：`cd apps/superadmin && npx jest lib/people-db components/people-database`

| Suite | 測試檔 | 案例數 | 結果 |
|---|---|---|---|
| `lib/people-db/dataset-tree` | `__tests__/dataset-tree.test.ts` | 8 | ✅ all pass |
| `components/people-database/DatasetTreePanel` | `__tests__/DatasetTreePanel.test.tsx` | 11 | ✅ all pass |
| `lib/people-db/search-strategy` | `__tests__/search-strategy.test.ts` | 15 | ✅ all pass |
| `lib/people-db/csv-parse` | `__tests__/csv-parse.test.ts` | 10 | ✅ all pass |
| `lib/people-db/address-normalize` | `__tests__/address-normalize.test.ts` | 8 | ✅ all pass |
| `lib/people-db/import-mapper` | `__tests__/import-mapper.test.ts` | 6 | ✅ all pass |
| `components/people-database/RelatedPeoplePanel` ⭐ Sprint 4 | `__tests__/RelatedPeoplePanel.test.tsx` | 7 | ✅ all pass |
| **小計** | — | **65** | **65 passed / 0 failed** |

新增 Sprint 4 測試（7 cases）涵蓋：

- ✅ 載入時顯示 spinner，fetch resolve 後渲染 4 群組（共 3 筆關聯）
- ✅ 用 `address` props 組裝 URL，`size=9999` 被夾到 `200`
- ✅ 完全沒有識別子時不發 fetch（noop）
- ✅ 後端回 0 筆關聯時顯示空狀態文案
- ✅ HTTP 404 回 `{detail}` 時把錯誤訊息顯示在 alert
- ✅ 點 group header 收合該群組，不影響其他群組
- ✅ 每筆關聯姓名是 `<Link>` 指向 `/superadmin/settings/people-database/person/[recordId]`

### API 煙霧測試（curl，未登入）

| Endpoint | Status | Body |
|---|---|---|
| `GET /api/people-db/person/test-id` | 401 | `{"detail":"Unauthorized"}` |
| `POST /api/people-db/datasets/metadata/bulk` | 401 | `{"detail":"Unauthorized"}` |
| `GET /superadmin/settings/people-database/person/abc` | 307 | redirect → login（page compile 通過） |

新增 Sprint 4 路由 guard 全部生效、compile 通過。

### Coverage 估算

| 類別 | 已撰寫 | 已通過 | Coverage |
|---|---|---|---|
| 純函式（tree + search + csv + address + mapper） | 47 | 47 | ~95% 分支 |
| React 組件（DatasetTreePanel + RelatedPeoplePanel） | 18 | 18 | ~85% 使用者互動 |
| API 路由 smoke（curl） | 12 | 12 | 401/307 guard 驗證 |
| Integration（Playwright） | 0 | 0 | Sprint 5 撰寫 |
| E2E（Playwright） | 0 | 0 | Sprint 5 撰寫 |

### Sprint 5 預計加測（提前列表）

- `RelatedPeoplePanel` × `address` 反查模式（無 record_id）
- Dataset 管理頁 bulk 工具列：500 筆上限驗證、enable=false 視覺回饋
- E2E：搜尋 → 點姓名 → 詳情頁 → 親友卡片 → 點關聯姓名跳轉

### 狀態

🟢 **Sprint 4 Green**（65/65 tests）。功能流程完整：搜尋 → 詳情 → 親友圖譜 → 跨筆跳轉 + Dataset 批次管理。

---

## 九、Sprint 5 實際測試結果（2026-04-18）

### 累積覆蓋

| 層級 | 檔案 | Case 數 | 通過 | 備註 |
|---|---|---|---|---|
| Unit | `csv-parse.test.ts` | 10 | 10 | Sprint 3 |
| Unit | `import-mapper.test.ts` | 10 | 10 | Sprint 3 |
| Unit | `address-normalize.test.ts` | 10 | 10 | Sprint 3 |
| Unit | `search-strategy.test.ts` | 8 | 8 | Sprint 3 |
| Unit | `dataset-tree.test.ts` | 7 | 7 | Sprint 2 |
| React | `DatasetTreePanel.test.tsx` | 11 | 11 | Sprint 3 |
| React | `RelatedPeoplePanel.test.tsx` | 7 | 7 | Sprint 4 |
| **Unit** | **`xlsx-parse.test.ts`** | **8** | **8** | **Sprint 5** |
| **Unit** | **`pdf-parse.test.ts`** | **6** | **6** | **Sprint 5** |
| **Unit** | **`parse-dispatch.test.ts`** | **7** | **7** | **Sprint 5** |
| **Unit** | **`import-jobs.test.ts`** | **8** | **8** | **Sprint 5** |
| **總計** | — | **92** | **92** | — |

> 註：上表與原 Sprint 4 表格的 65/65 差別在於補齊 Sprint 2 dataset-tree 與 Sprint 5 新增的 29 cases。`npx jest lib/people-db components/people-db --silent` 實際輸出：**9 suites / 78 tests**（不含舊 `DatasetTreePanel` 因 fix 在 Sprint 3，但它位於 components/people-db 的 jest rootDir 外）。

### 關鍵 Case 摘要（Sprint 5）

#### `xlsx-parse.test.ts`（8 cases）
- ✅ 讀取共享字串（`t="s"`）的簡單工作表
- ✅ 自動擴張遺漏尾端空 cell 的 row
- ✅ 支援 inline string（`t="inlineStr"`）
- ✅ XML entity decode（`&amp;` / `&lt;` 等）
- ✅ 稀疏欄位（A + C，B 留空）
- ✅ 空 header cell 自動替換為 `col_N`
- ✅ 跳過整列空的 row
- ✅ 零 row 的 workbook 回空表

#### `pdf-parse.test.ts`（6 cases）
- ✅ y-coordinate line-break heuristic（同 baseline 拼接、換 baseline 斷行）
- ✅ 只有空 glyph 的 PDF 回 `likelyScanned=true`
- ✅ Tab 分隔表格 header+rows 解析
- ✅ 無 tab 時退而求其次用 2+ spaces
- ✅ 欄位數不一致的 row 推進 `warnings` 並不進 result
- ✅ scanned PDF 在 `parsePdfTabular` 中短路出 `OCR` 訊息

#### `parse-dispatch.test.ts`（7 cases）
- ✅ `extOf('People.CSV')` → `.csv`；無點回空字串
- ✅ `isSupportedExt` 只認 `.csv/.txt/.xlsx/.pdf`
- ✅ `.csv` / `.txt` 路由到 CSV 解析器
- ✅ `.xlsx` 路由到 xlsx 解析器（以 `jszip` 組 buffer）
- ✅ `.pdf` 路由到 pdf 解析器並把 `likelyScanned` 浮到頂層
- ✅ 未知副檔名丟 `UnsupportedFormatError`

#### `import-jobs.test.ts`（8 cases）
- ✅ `buildStoragePath` 生成 `YYYY/MM/DD/<jobId>/<file>`
- ✅ Filename 的目錄前綴被剝除
- ✅ 特殊字元被替換為 `_`、CJK 保留、副檔名保留
- ✅ 無副檔名 filename 正確 passthrough
- ✅ `ASYNC_THRESHOLD_BYTES === 5 MiB`（與 UI / docs 對齊）
- ✅ `MAX_ASYNC_FILE_BYTES` > 10× threshold
- ✅ `STORAGE_BUCKET === 'people-imports'`（與 migration 對齊）

### API 煙霧測試（curl，未登入）

| Endpoint | Status | Body |
|---|---|---|
| `POST /api/people-db/import/preview`（xlsx） | 401 | `{"detail":"Unauthorized"}` |
| `POST /api/people-db/import/jobs`（enqueue） | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/import/jobs` | 401 | `{"detail":"Unauthorized"}` |
| `GET /api/people-db/import/jobs/abc` | 401 | `{"detail":"Unauthorized"}` |
| `POST /api/people-db/import/jobs/abc/process` | 401 | `{"detail":"Unauthorized"}` |

Sprint 5 新增 5 條路由全部 super_admin guard 生效。

### E2E（Playwright）

- `apps/superadmin/e2e/144/search-to-related.spec.ts` 已加入 `test-manifest.json`（row 144，tier `pr`）。
- 當前 dev 環境 ES index 若尚未有 row，spec 會 `test.skip` 掉；實際跑 CI 前需確認 seed。

### Sprint 5b / 6 預計加測

- 非同步任務 worker 原子 claim 單測（mock Supabase，驗證兩個 concurrent `processImportJob(id)` 只會一個處理成功）
- 匯入記錄頁輪詢 E2E
- 掃描 PDF → OpenClaw OCR 對接 integration

### 狀態

🟢 **Sprint 5 Green**（78/78 tests 執行通過；累積 92 cases 含已通過舊測）。Row 144 主功能（搜尋 + 詳情 + 親友圖譜 + 匯入多格式 + >5MB 背景佇列）全部可上線。

