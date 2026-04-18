# 尋人資料庫 — 大規模批次 Ingestion Pipeline（TDD Spec）

**Row ID**：145
**建立日期**：2026/04/18
**對應 Dev Spec**：[people-db-bulk-ingestion-dev-spec-20260418.md](./people-db-bulk-ingestion-dev-spec-20260418.md)
**測試框架**：Jest（unit + integration）+ Playwright（E2E）
**路徑規範**：
- Pure 函式單測：`apps/superadmin/lib/people-db/__tests__/*.test.ts`
- Row 145 專屬 unit / integration：`apps/superadmin/unit_test/145/`
- Row 145 專屬 E2E：`apps/superadmin/e2e/145/`
- CLI 整合測試：`tools/people-db/__tests__/*.test.ts`

---

## 目錄

- [Sprint 1 — File Inventory](#sprint-1--file-inventory)
- [Sprint 2 — 結構化 parser](#sprint-2--結構化-parser)
- [Sprint 3 — PDF 轉置偵測 + OCR Mock](#sprint-3--pdf-轉置偵測--ocr-mock)
- [Sprint 4 — Entity Resolution + 半自動 UI](#sprint-4--entity-resolution--半自動-ui)
- [Sprint 5 — IK Analyzer + Reindex](#sprint-5--ik-analyzer--reindex)
- [Sprint 6 — Orchestrator + 監控 UI](#sprint-6--orchestrator--監控-ui)
- [Sprint 7 — NAS 遷移](#sprint-7--nas-遷移)
- [共用測試策略](#共用測試策略)
- [覆蓋率目標](#覆蓋率目標)

---

## Sprint 1 — File Inventory

### 1.1 Pure 函式單元測試（`apps/superadmin/lib/people-db/__tests__/inventory.test.ts`）

| # | 測試案例 | 斷言 |
|---|---|---|
| 1 | `computeSha256Stream` 對 1 KB Buffer 與 `crypto.createHash` 結果一致 | hex 相等 |
| 2 | `computeSha256Stream` 對 > 256 MB 假檔（Readable.from chunks）不 OOM | 記憶體峰值 < 100 MB（以 `process.memoryUsage().heapUsed` 粗估） |
| 3 | `deriveDatasetRoot('/Volumes/KLEVV-4T-2/台灣尋人資料庫/台北市里長/11051723680.pdf', '/Volumes/KLEVV-4T-2/台灣尋人資料庫')` | `dataset_root='台北市里長'`、`dataset_subpath=null` |
| 4 | `deriveDatasetRoot(...'/企業名錄/2012/三萬/a.xls')` | `dataset_root='企業名錄'`、`dataset_subpath='2012/三萬'` |
| 5 | `detectMimeByExt('.MDB')` | 回 `application/x-msaccess`，副檔名大小寫不敏感 |
| 6 | `shouldReparse(existing, incoming)`：sha256 相同、mtime 改變 | 回 `false`（已在庫，跳過） |
| 7 | `shouldReparse(existing, incoming)`：sha256 相同、size 不同 | 不該發生；若真發生 log warning 並回 `false` |
| 8 | `shouldReparse(existing, incoming)`：sha256 不同 | 回 `true` + `reason='content_changed'` |
| 9 | `classifyStatus` 對未支援副檔名（e.g. `.zip`） | 回 `'skipped_unsupported'` |
| 10 | `classifyStatus` 對 `.pdf / .xlsx / .mdb / .dbf / .xls / .accdb / .csv / .txt` | 回 `'pending'` |

### 1.2 DB 層整合測試（`apps/superadmin/unit_test/145/inventory-db.test.ts`）

用本地 Supabase（`http://localhost:54321`）跑，每測起始前 `TRUNCATE people_db_files RESTART IDENTITY CASCADE`。

| # | 測試案例 | 斷言 |
|---|---|---|
| 1 | `upsertFile` 新檔案 | 回 `{ inserted: true, id }`，DB 有 1 筆 `status='pending'` |
| 2 | `upsertFile` 同 sha256 二次呼叫 | 回 `{ inserted: false }`，DB 仍 1 筆；`attempts` 不增 |
| 3 | `upsertFile` 同 sha256、`source_path` 改變（檔案被搬） | 回 `{ inserted: false, pathUpdated: true }`；row 的 `source_path` 更新到新路徑 |
| 4 | `markMissing(path)` | 指定 path 的 row → `status='missing'`；其他 row 不動 |
| 5 | `listFiles({ status: 'pending', dataset_root: '台北市里長' })` | 只回對應資料，正確分頁（limit/offset） |
| 6 | RLS：以非 super_admin JWT 插入 | 拒絕（error code `42501` 或 Supabase 等效錯誤） |
| 7 | RLS：`service_role` 客戶端插入 | 成功 |

### 1.3 CLI 整合測試（`tools/people-db/__tests__/scan.test.ts`）

建立 tmp 目錄 fixture（3 檔：1 `.pdf`、1 `.xls`、1 `.zip`），用 child_process 呼叫 `scan.ts`。

| # | 測試案例 | 斷言 |
|---|---|---|
| 1 | 首次 scan tmp/ | DB 有 3 筆；`.zip` status=`skipped_unsupported`，其餘 `pending`；exit 0 |
| 2 | 立即重跑 scan | stdout 顯示 `new: 0, updated: 0, skipped: 3`；exit 0 |
| 3 | 刪 1 檔後 scan | 該 row `status='missing'`；stdout `missing: 1` |
| 4 | 修改 1 檔內容（`echo 'x' >> file.pdf`）後 scan | sha256 變，row 更新為新 sha256，`status` 回 `pending`、`attempts=0` |
| 5 | 讀 `PEOPLE_DB_SOURCE_ROOT` env（不帶 `--root` 參數） | 正常執行 |
| 6 | 無 env 也無 `--root` | exit 1 + 友善錯誤訊息 |

### 1.4 API 整合測試（`apps/superadmin/unit_test/145/api-ingest-files.test.ts`）

`GET /api/people-db/ingest/files`：

| # | 測試案例 | 斷言 |
|---|---|---|
| 1 | 未登入 | 307 redirect 到 `/login` |
| 2 | 登入但非 super_admin | 403 |
| 3 | super_admin + 無 query | 回 pending 筆數 + 首頁資料；`total` 與 DB count 一致 |
| 4 | `?status=failed` | 只回 failed；其他不含 |
| 5 | `?dataset_root=台北市里長&page=2&page_size=20` | 正確分頁；`page_size` 最大 100（超過回 400） |

### 1.5 Sprint 1 驗收清單

- [ ] 單元測試 ≥ 10 cases（1.1）全綠
- [ ] DB 層 ≥ 7 cases（1.2）全綠
- [ ] CLI ≥ 6 cases（1.3）全綠
- [ ] API ≥ 5 cases（1.4）全綠
- [ ] 對 `/Volumes/KLEVV-4T-2/台灣尋人資料庫` 實跑 `scan`：完成後 DB count 與 `find | wc -l` 一致，重跑 new=0

---

## Sprint 2 — 結構化 parser

### 2.1 Pure 函式單測

| 檔 | 測試 | 斷言 |
|---|---|---|
| `__tests__/mdb-parse.test.ts` | 對 fixture `fixtures/(5)綜合全.mdb` 跑 `parseMdb()` | 回 ≥ 1 張 table，每張 table `{ tableName, columns, rows }`；至少 1 筆 row 有中文值 |
| 同上 | `.mdb` 密碼保護 → 呼叫 `parseMdb()` | throw `MdbProtectedError`，message 含「密碼保護」 |
| 同上 | `mdbtools` 未安裝 | throw `MdbToolsNotFoundError`，安裝指引含 `brew install mdbtools` 與 `apt-get install` |
| `__tests__/dbf-parse.test.ts` | fixture `fixtures/sample.dbf` | 回 `{ columns, rows }`；數字欄位是 number 非 string |
| 同上 | 空 dbf（只有 header） | 回 `{ columns: [...], rows: [] }`，不 throw |
| `__tests__/xls-parse.test.ts` | fixture `fixtures/三光小學-5.xls` | 回 `{ columns, rows }`；中文不亂碼（BIG5/UTF-8 皆可） |
| 同上 | 多 sheet 的 `.xls` | 預設讀第一張；若 option `{ sheet: 2 }` 讀第二張 |
| 同上 | 不存在的檔案 | throw `ENOENT` |
| `__tests__/parse-dispatch.test.ts` 擴充 | `extOf('file.MDB')` | 回 `.mdb`（lowercase） |
| 同上 | `dispatchParse(file with ext='.mdb')` | 呼叫 `parseMdb` 而非 `parsePdfTabular` |
| 同上 | `dispatchParse(file with ext='.xls')` | 呼叫 `parseXls`（非 `parseXlsx`） |

### 2.2 Dead-letter 行為測試

| # | 測試 | 斷言 |
|---|---|---|
| 1 | parser throw → router 捕獲並回傳 `{ ok: false, error }` | 呼叫端能安全 continue |
| 2 | router 不因單檔 throw 而中止 batch | 對 10 檔（其中 3 檔故意壞）跑 `parseBatch`，回 7 成功 + 3 失敗 |
| 3 | 失敗 3 次以上的檔案 `status='failed'` 且 `attempts>=3` | 不再排入下次 parse 排程 |

### 2.3 Sprint 2 驗收清單

- [ ] 4 parser 單測 ≥ 11 cases 全綠
- [ ] Dead-letter 3 cases 全綠
- [ ] 對硬碟抽樣 10 檔（每類 ≥ 1）實跑 parse，成功率 ≥ 80%
- [ ] CI image 裝 mdbtools 成功、macOS `brew install mdbtools` 文件更新

---

## Sprint 3 — PDF 轉置偵測 + OCR Mock

### 3.1 PDF 轉置表偵測（`__tests__/pdf-parse-transposed.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `detectTransposedTable(['編號\t305\t306', '姓名\t闕貴卿\t詹坤隆', ...])` | 回 `true` |
| 2 | `detectTransposedTable(['name\tphone\taddress', '王小明\t0912\t...'])` | 回 `false`（標準表） |
| 3 | 字典命中門檻：首欄 ≥ 3 個 cell 在字典裡 | 回 `true` |
| 4 | 字典命中 < 3 個 | 回 `false` |
| 5 | `transposeTable({ rows: [['編號','305','306'], ['姓名','闕貴卿','詹坤隆'], ['地址','南港路212號','中南街123號']] })` | 回 `{ columns: ['編號','姓名','地址'], rows: [{編號:'305',姓名:'闕貴卿',地址:'南港路212號'}, ...] }` |
| 6 | 對里長 PDF fixture 整合跑 `parsePdfTabular()` | `rows[0].姓名='闕貴卿'` 且 `rows[0].地址='南港路一段212號2樓'`（**不是**重陽路 504 巷 1 弄 9 號） |
| 7 | 對一般 CSV-like PDF（非轉置）跑 | 行為與 Row 144 一致，不 regression |

### 3.2 OcrClient Interface（`__tests__/ocr-client.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `MockOcrClient.enqueue(fileId, buffer)` | 回 `{ jobId }`；同輸入冪等（同 jobId） |
| 2 | `MockOcrClient.onCallback(jobId, { rows, confidence })` | 觸發註冊的 handler，handler 收到 `{ jobId, rows, confidence }` |
| 3 | `MockOcrClient` 可設定 `delay=500ms` 模擬非同步 | 500ms 後才 fire callback |
| 4 | 多個 handler 註冊 | 每個都被呼叫 |
| 5 | `MockOcrClient.failJob(jobId, reason)` | handler 收到 `{ error: reason }`；可驗證失敗路徑 |

### 3.3 OCR Callback API（`unit_test/145/api-ocr-callback.test.ts`）

`POST /api/people-db/ingest/ocr/callback`：

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 無 HMAC header | 401 |
| 2 | HMAC 無效 | 401 |
| 3 | HMAC 有效 + jobId 不存在 | 404 |
| 4 | HMAC 有效 + 正常 payload | 200；對應 file row `status='parsed'`；ES 被呼叫 bulk index（mock 驗證） |
| 5 | 重複 callback 同 jobId | 200 但不重複 index（idempotent key 用 jobId） |

### 3.4 Sprint 3 驗收清單

- [ ] 轉置偵測 ≥ 7 cases + OcrClient ≥ 5 cases + Callback API ≥ 5 cases 全綠
- [ ] 里長 PDF 實測：闕貴卿 row 地址正確
- [ ] 真 OpenClaw client 實作替換 Mock 只改 1 個 import，business code 不動（靠 interface）

---

## Sprint 4 — Entity Resolution + 半自動 UI

### 4.1 ER 核心邏輯（`__tests__/entity-resolution.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 新 record 有 id_number，DB 存在同 id_number 的 person | `{ action: 'auto_merge', person_id, reason: 'id_exact' }` |
| 2 | 新 record 有 id_number、DB 無 | `{ action: 'new_person', canonical: {...} }` |
| 3 | 新 record 無 id_number、姓名+電話在 DB 命中 | `{ action: 'candidate', person_id, reason: 'name_phone', confidence: 0.85 }` |
| 4 | 同 3 但該配對已在 blacklist | `{ action: 'new_person' }`（跳過候選） |
| 5 | 新 record 無 id_number、姓名+(county+district+road) 命中 | `{ action: 'candidate', reason: 'name_addr', confidence: 0.7 }` |
| 6 | 新 record 無任何識別 | `{ action: 'new_person' }` |
| 7 | Normalize 後姓名去空白比對：`"王 小明"` 與 `"王小明"` | 視為相同 |
| 8 | 大陸簡體姓名差異：不 normalize（保留原字） | 回 `new_person`（不誤合） |

### 4.2 候選表 CRUD（`unit_test/145/merge-candidates-db.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `createCandidate(personA, recordB, reason, confidence)` | DB 有 1 筆 `status='pending'` |
| 2 | 同對 (personA, recordB) 重複呼叫 | 不產生重複（唯一約束或 upsert） |
| 3 | `confirmCandidate(id, userId)` | 該對寫入 `people_db_person_sources` + blacklist **不**新增；status='confirmed' |
| 4 | `rejectCandidate(id, userId)` | blacklist 新增；status='rejected' |
| 5 | RLS：非 super_admin 讀 | 空結果 |

### 4.3 候選頁 UI（`apps/superadmin/unit_test/145/MergeCandidatesPage.test.tsx`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 初始 render pending 3 筆 | 顯示 3 張卡片，每張含 A/B 兩邊對照欄位、confidence、match_reason |
| 2 | 點 confirm → 呼叫 API、卡片消失、toast 成功 | API 被呼叫 with correct id |
| 3 | 點 reject → 同上 | 同上 |
| 4 | 錯誤 state（API 500）| 顯示錯誤訊息、卡片保留 |
| 5 | 空列表 | 顯示「目前沒有待確認的候選」|

### 4.4 搜尋頁 person 聚合 toggle（`apps/superadmin/unit_test/145/search-person-toggle.test.tsx`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 預設 toggle = person | API call 帶 `?group_by=person` |
| 2 | 切到 record | API call 帶 `?group_by=record` |
| 3 | Person 結果底下可展開 source 列表 | 展開後顯示 N 筆 record 對應 |

### 4.5 Sprint 4 驗收清單

- [ ] ER 核心 ≥ 8 cases + 候選 CRUD ≥ 5 cases + UI ≥ 5 + toggle ≥ 3 全綠
- [ ] 實跑：同資料集匯入後搜尋「闕貴卿」預設回 1 筆 person
- [ ] Admin 在 UI reject 一筆 → 重跑 ER 該對不再出現

---

## Sprint 5 — IK Analyzer + Reindex（與 Sprint 2 並行）

### 5.1 Plugin 安裝驗證（`tools/people-db/__tests__/ik-install.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | ES 已安裝 IK：`GET _cat/plugins` | 輸出含 `analysis-ik` |
| 2 | IK 版本 === ES 版本 | 字串完全相等；否則 test fail 並提示版本對齊 |

### 5.2 Mapping 與 analyzer 行為

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `GET people_v2/_analyze?analyzer=ik_max_word&text=闕貴卿` | tokens 含 `闕貴卿`（不是只 `闕`、`貴`、`卿` 逐字） |
| 2 | `GET people_v2/_analyze?analyzer=ik_max_word&text=台北市大安區忠孝東路四段1號` | 含 `台北`、`大安`、`忠孝東路`、`四段` 合理分詞 |
| 3 | `name.keyword` exact match | 搜「闕貴卿」exact 得分高於 fuzzy |

### 5.3 Reindex 與切 alias

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `reindex.ts` 從 people_v1 → people_v2 | 完成後 `_count` 相等 |
| 2 | 節流：requests_per_second 設 500，1 萬筆約 20 秒 | 時間在容忍範圍（± 30%） |
| 3 | `swap-alias.sh`：alias people 指向 v2 後 | `GET people/_search` 命中的 index 是 v2 |
| 4 | 切完後刪 v1：`DELETE people_v1` | 不影響搜尋 |

### 5.4 Sprint 5 驗收清單

- [ ] Plugin + Mapping + Reindex 共 ≥ 9 cases 全綠
- [ ] 對本機 ES 1 萬筆 seed 資料跑完整流程
- [ ] `_analyze` 驗證前端搜尋關鍵字在新 analyzer 下切法合理

---

## Sprint 6 — Orchestrator + 監控 UI

### 6.1 CLI 整合（`tools/people-db/__tests__/ingest.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `ingest.ts --stage=scan` | 僅 scan，不 parse |
| 2 | `ingest.ts --stage=all` 對 fixture 跑完 | 各 stage 寫入 `people_db_ingest_runs`；最終 `finished_at` 非 null |
| 3 | `ingest.ts --stage=parse` 遇 dead-letter | stderr 顯示 failed 列表；exit code 0（不中止） |
| 4 | Ctrl+C | 優雅 shutdown，寫入 `finished_at` 與 `notes='interrupted'` |

### 6.2 監控頁（`apps/superadmin/unit_test/145/IngestDashboard.test.tsx`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 顯示各 stage 檔案數卡片（pending/parsing/parsed/normalized/resolved/indexed/failed） | 數字與 mock API 一致 |
| 2 | 失敗列表可 retry 單檔 | 點 retry → API 被呼叫；row status 回 `pending`、`attempts` 重置 0 |
| 3 | 最近 10 次 run timeline | 時間序正確；失敗 run 標紅 |

### 6.3 Retry API（`unit_test/145/api-retry.test.ts`）

| # | 測試 | 斷言 |
|---|---|---|
| 1 | 未登入 | 307 |
| 2 | super_admin retry 存在的 fileId | 200；row 回 pending、attempts=0 |
| 3 | retry 不存在 fileId | 404 |
| 4 | retry 成功狀態（非 failed）| 400 + 訊息「僅失敗檔案可重試」|

### 6.4 E2E（`apps/superadmin/e2e/145/ingest-flow.spec.ts`）

| # | 案例 | 步驟 |
|---|---|---|
| 1 | 完整 happy path | seed 3 fixture 檔 → 訪問 `/ingest` → 看到 pending 3 → 點「執行 scan」→ 看到 done 3 |
| 2 | Dead-letter retry | seed 1 故意壞的檔 → 執行 → 出現 failed 1 → 點 retry → 重跑仍 failed（但 attempts=1） |
| 3 | OCR 流程（mock） | seed 掃描 PDF → `ocr_queued` → mock callback → `parsed` |

### 6.5 Sprint 6 驗收清單

- [ ] CLI ≥ 4 + UI ≥ 3 + API ≥ 4 + E2E ≥ 3 全綠
- [ ] 監控頁可看到 stage 數 + dead-letter + run 歷程

---

## Sprint 7 — NAS 遷移

| # | 測試 | 斷言 |
|---|---|---|
| 1 | `migrate-source-path.ts` dry-run | stdout 列出 N 筆將被改；DB 不動 |
| 2 | 實跑 | 所有 `source_path` 從舊 prefix 換到新 prefix；sha256 不變；row_id 不變 |
| 3 | 改 env → 重跑 `scan --dry-run` | new=0（因 sha256 已存在） |
| 4 | 文件存在：`docs/operational-guides/people-db-nas-setup.md` | 內含掛載、權限、備份章節 |

---

## 共用測試策略

### Mock 策略

| 外部依賴 | 單元測試 | 整合測試 |
|---|---|---|
| Supabase | `jest.mock('@/utils/supabase/admin')` | 真實 local instance |
| Elasticsearch | mock `esBulkIndex` / `esSearch` | 真實 `http://localhost:9200` |
| OpenClaw | `MockOcrClient`（Sprint 3 定義） | 同左（真 client 上線前） |
| `mdbtools` 子程序 | `jest.spyOn(child_process, 'spawn')` | 真實 CLI（需 CI image 裝） |
| 檔案系統 | `mock-fs` 或 tmp dir | 真實 tmp dir |

### Fixture 檔案位置

`apps/superadmin/lib/people-db/__tests__/fixtures/`：
- `sample.mdb`（匿名化 5 筆假資料）
- `sample.dbf`
- `三光小學-5.xls`（匿名化）
- `里長-transposed.pdf`（轉置表 fixture，含闕貴卿）
- `scanned.pdf`（純圖 PDF）
- `sample.csv`（Row 144 已有，沿用）

> ⚠️ Fixture 一律用**匿名化假資料**，禁 commit 真實個資。

### Jest 執行

```bash
# 全部（含 Row 145）
npm test --workspace superadmin

# 只跑 Row 145 專屬
npm test --workspace superadmin -- unit_test/145

# 只跑 lib pure 函式（通常最快）
npm test --workspace superadmin -- lib/people-db/__tests__
```

### Playwright E2E

```bash
# Row 145 E2E
npx playwright test apps/superadmin/e2e/145/
```

---

## 覆蓋率目標

| 類型 | 目標 | 強制 |
|---|---|---|
| Pure 函式單測 | ≥ 90% | ✅ PR 卡關 |
| DB 層整合 | 新 API 100% routes | ✅ |
| UI 單測 | ≥ 80% component branch | ⚠️ 建議 |
| E2E | 3 條核心 path 全綠 | ✅ |
| 實資料驗證 | 對硬碟抽樣 10 檔成功率 ≥ 80% | ✅（Sprint 2、6 驗收） |

---

## 測試 manifest 更新

完成 Sprint 6 時加入 `apps/superadmin/test-manifest.json`：

```json
{
  "id": "145",
  "tier": "pr",
  "unitTestPath": "apps/superadmin/unit_test/145",
  "e2ePath": "apps/superadmin/e2e/145",
  "nightlyLayer": "integration",
  "nightlyOrder": 4
}
```

---

## 一鍵驗收腳本（Sprint 6 結束前交付）

`tools/people-db/verify-row145.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail
npm test --workspace superadmin -- lib/people-db/__tests__
npm test --workspace superadmin -- unit_test/145
npx playwright test apps/superadmin/e2e/145/
tools/testing/validate-test-manifest.sh
echo "✅ Row 145 全綠"
```
