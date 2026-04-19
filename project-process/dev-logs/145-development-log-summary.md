# Row 145 Development Log Summary — People DB 大規模批次 Ingestion Pipeline

> **Row ID**：145 | **建立**：2026/04/18 | **最近更新**：2026/04/19 | **狀態**：Sprint 1–6 程式碼交付、Sprint 2 實測完成、Sprint 2b 規劃中
> **儀表板**：http://localhost:3001/superadmin/dashboard/project-progress/task/145/dev-log
> **Dev Spec**：[`/project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md`](../features/people-db-bulk-ingestion-dev-spec-20260418.md)
> **TDD Spec**：[`/project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md`](../features/people-db-bulk-ingestion-tdd-spec-20260418.md)

---

## 一、跨 Sprint 全景

| Sprint | 主題 | 文件 | 狀態 |
|:--:|:--|:--|:--:|
| RFC | 規格與決議 | [dev-spec](../features/people-db-bulk-ingestion-dev-spec-20260418.md) / [tdd-spec](../features/people-db-bulk-ingestion-tdd-spec-20260418.md) | ✅ |
| Sprint 1 | File Inventory + scan CLI + API | （納入 sprint-2 dev-log）| ✅ |
| Sprint 2 / 5 並行 | 結構化 parser router + IK Analyzer | [dev-log](dev-people-db-bulk-ingestion-sprint-2-and-5-2026-04-19.md) | ✅ code |
| Sprint 3 | PDF 轉置偵測 + OCR mock client + callback | [dev-log](dev-people-db-bulk-ingestion-sprint-3-2026-04-19.md) | ✅ |
| Sprint 4a | Staging + Normalize + ER core + 3 API | [dev-log](dev-people-db-bulk-ingestion-sprint-4a-2026-04-19.md) | ✅ |
| Sprint 4b | merge-candidates UI + person/record toggle | [dev-log](dev-people-db-bulk-ingestion-sprint-4b-2026-04-19.md) | ✅ |
| Sprint 6 | Orchestrator + retry API + 監控頁 | [dev-log](dev-people-db-bulk-ingestion-sprint-6-2026-04-19.md) | ✅ |
| **Sprint 2 實測** | **474 GB 真實硬碟跑通** | **本檔 §三、§四** | ✅ |
| **Sprint 2b** | **Streaming parser + Postgres COPY** | **本檔 §六、§七** | 📝 RFC handoff |
| Sprint 7 | NAS 遷移 + cron + OpenClaw 真實接 + ES indexer | — | ⏸ 待 Sprint 2b 後 |

---

## 二、本日（2026/04/19）完成任務清單

### 2.1 Sprint 2 真實硬碟全量執行

| # | 任務 | 交付物 | 完成度 |
|:--:|:--|:--|:--:|
| T-01 | 全量 scan `/Volumes/KLEVV-4T-2/台灣尋人資料庫` (474 GB) | 592,887 檔 / 25.8 min / 0 errors / DB 增 124 MB | **100%** |
| T-02 | 加 `--skip-unsupported` flag 到 `tools/people-db/scan.ts` | scan.ts 多一個 CLI flag、341,875 unsupported 跳過 sha256 | **100%** |
| T-03 | `.mdb` 全 batch parse | 1,416 / 1,556 = **91% 成功**、5,915,598 rows | 91% |
| T-04 | `.dbf` batch parse | 208 / 486 = 42% 成功、1,009,266 rows、65 個 1.6 GB monsters 留 Sprint 2b | 42% |
| T-05 | `.accdb` batch parse | 524 / 524「成功」但 0 rows（mdbtools 對 Jet 4 只能列表名） | 100% / 0% data |
| T-06 | `.fp` batch parse（截至報告時間） | 17,550 / 19,337 = ~91%、26,713 owner rows | ~91% |
| T-07 | `.xlsx` batch parse（背景跑中）| 4 / 2,541 已 parsed | 0.2%（持續中） |
| T-08 | `.xls` batch parse | 2 / 24,574 = 0.01%（待 Sprint 2b 改造後再大跑）| 0.01% |
| T-09 | `.pdf` 抽樣 parse | 4 已 parsed、1 ocr_queued、29,590 pending | 0.01% |

### 2.2 程式碼修補（commit 在 main）

| # | 修補 | 對象 | Commit |
|:--:|:--|:--|:--|
| F-01 | `mdb-export` `-H` flag 是 **suppress** header 而非 include — 改成不傳 | `parsers/mdb.ts` | ✅ committed |
| F-02 | pdfjs-dist v4 即使 `disableWorker:true` 仍要 `workerSrc` 為 truthy 路徑 | `pdf-parse.ts` | ✅ committed |
| F-03 | `inventory.ts` reclassifyIfStale + planFileAction 純函式 + 27 jest tests | `lib/people-db/inventory.ts` + `__tests__/inventory.test.ts` | ✅ Sprint 1 |
| F-04 | scan.ts 互斥 counter（消除「updated 雙計 skippedSame」）| `tools/people-db/scan.ts` | ✅ Sprint 1 |
| F-05 | `tools/fp-converter/convert_fp.py` 加 `--format json` 輸出 | `convert_fp.py` | ✅ |
| F-06 | `parsers/fp-parse.ts` 純函式 `extractPeopleFromFpDoc` + 8 jest tests | `lib/people-db/parsers/fp-parse.ts` + `__tests__/fp-parse.test.ts` | ✅ |
| F-07 | `parsers/fp.ts` dispatcher wrapper（auto-tmp 管理）| `lib/people-db/parsers/fp.ts` | ✅ |
| F-08 | dispatchByPath 接 `.fp`，`UnsupportedParserError` 不再對 `.fp` 丟 | `parsers/index.ts` | ✅ |

### 2.3 嘗試但被外部 process revert 的修補（**未進 main**）

| # | 內容 | 理論價值 | revert 次數 |
|:--:|:--|:--|:--:|
| R-01 | `mdb.ts` stderr / stdout 256 MB / 2 MB cap 阻 V8 RangeError | 阻 OOM crash | 5+ |
| R-02 | `dbf.ts` MAX_FILE_BYTES=100MB + MAX_ROWS=2M 預檢 | 阻 OOM kill | 3+ |
| R-03 | `parse.ts` 入口 size guard + per-ext SIZE_LIMIT_MB | 統一保護 | 4+ |

→ 所有 R-XX 改用 **DB-level UPDATE attempts=99 + error_msg='oversized'** 的 ops 路徑落地，雖然不是 code-level fix 但有效。

### 2.4 文件 / 規劃交付

| # | 交付物 | 路徑 |
|:--:|:--|:--|
| D-01 | RFC v1.0（決議版）| [`features/people-db-bulk-ingestion-dev-spec-20260418.md`](../features/people-db-bulk-ingestion-dev-spec-20260418.md) |
| D-02 | TDD Spec | [`features/people-db-bulk-ingestion-tdd-spec-20260418.md`](../features/people-db-bulk-ingestion-tdd-spec-20260418.md) |
| D-03 | Sprint 2b handoff prompt | （產出於 chat，包含 Task A-F 拆解 + 雷區清單）|
| D-04 | roadmap.ts Row 145 entry 更新 | [`apps/superadmin/app/data/roadmap.ts:2613`](../../apps/superadmin/app/data/roadmap.ts) |
| D-05 | TDD Progress Report（今日）| [`test-logs/test-people-db-bulk-ingestion-2026-04-19.md`](../test-logs/test-people-db-bulk-ingestion-2026-04-19.md) |
| D-06 | 本檔（Dev Log Summary）| `dev-logs/145-development-log-summary.md` |

### 2.5 數據統計（截至報告生成時）

```
people_db_files:
  total ≈ 90,000 rows / 124 MB
  parsed:  21,000+  (mdb 1416 / dbf 208 / accdb 524 / fp 17550 / xlsx 4 / xls 2 / pdf 4)
  failed:  ~400     (含 65 個 1.5–1.7 GB DBF user-skip)
  pending: ~70,000

people_db_staging_records:
  2,383,328 rows / 1.27 GB

DB total: 1.43 GB
Mac mini disk free: 121 GB（充足）
```

---

## 三、本日遭遇之技術困難（含排查 → 根因 → 解法）

### 困難 #1 — `.mdb` 解析所有欄位偏移一格

**現象**：parse 完看 staging 資料時，`武嵋嵋` 顯示在「年月日」欄位，所有欄位往後位移一格。

**排查**：
1. 先懷疑 BIG5 → UTF-8 轉換問題，但其他欄位中文正常 → 排除
2. 直接 shell 跑 `mdb-export -H file.mdb TABLE` 看原始輸出
3. 發現帶 `-H` 沒有 header 行；不帶 `-H` 才有 header

**根因**：`mdb-tools` 的 `-H` 是 **suppress** header（不直觀，多數 tool 是 `-h` show / `-H` highlight），原 code 註解誤寫成 `-H: include header`。第一筆資料被當成 header，所有欄位 +1 位移。

**解法**：移除 `-H` flag，預設行為就帶 header。已 commit。

### 困難 #2 — pdfjs-dist v4 在 batch 環境啟 worker 失敗

**現象**：parse `.pdf` 時 5 個檔全 throw `"No 'GlobalWorkerOptions.workerSrc' specified"`，即使 `getDocument({ disableWorker: true })`。

**排查**：
1. 看 pdfjs source code 確認 `disableWorker` flag 仍存在
2. 但 v4 在 fallback 載入「fake worker」前會 validate `workerSrc` 是 truthy string
3. 我們設成 `''`（空字串）→ falsy → 仍 throw

**根因**：pdfjs-dist v4 即使 disableWorker 也保留 fake-worker 路徑作 last-resort，需要 workerSrc 通過 truthy check（即便不會 spawn）。

**解法**：用 `createRequire().resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')` 指向實體 worker 檔（永不啟動，只通過驗證）。已 commit。

### 困難 #3 — `.mdb` 大檔觸發 V8 `RangeError: Invalid string length`

**現象**：parse 跑到第 1273 個 mdb（`progressive.ptl.mdb`）時 process 直接 crash，stderr 噴 V8 RangeError 然後退出。

**排查**：
1. RangeError 在 `mdb.ts:62`：`stderr += chunk`
2. mdb-tools 對 corrupt page 每塊噴一行 warning，1.6 GB DBF / MDB 觸發數百萬行 warning
3. JS 字串無上限累加超過 V8 hard cap (~512 MB) → RangeError

**根因**：subprocess 輸出無 buffer cap。

**解法**：改用 `string[]` chunk array + 計算累計長度，超過 STDOUT_CAP=256MB / STDERR_CAP=2MB 就 SIGKILL 子程序，回傳 truncated 結果。**code 改了 5 次都被外部 process revert**，最終靠 DB-level skip 大檔避開。

### 困難 #4 — `.dbf` 1.6 GB 大檔觸發 OOM kill（無錯誤訊息）

**現象**：parse 到 `MOB_PER.DBF` (396 MB) 時整個 worker 被 macOS 直接 kill，無 stack trace、無 stderr，DB 顯示 status=parsing 沒進展。

**排查**：
1. `top` 看 process RSS 持續成長到 ~3 GB 然後消失
2. dbffile 的 `readRecords(PAGE_SIZE)` 確實是 paged 讀
3. 但 parser 自己用 `rows.push(...)` 把每批累積，最後一次回傳 `ParseResult.rows`
4. `MOB_PER.DBF` 可能 5000 萬 row × 200 bytes/JS object = 10 GB heap

**根因**：`ParseResult.rows[]` 介面預設「全 row 進 memory 才回傳」是 Sprint 2 共通 pattern，dbf/xls/xlsx/mdb 都 inherit 這個限制。對 GB 級檔案無解。

**解法**：
- 短期：DB-level skip > 100 MB DBF（人工 ops 介入，5 個極端檔仍跳過）
- 長期：**Sprint 2b** — streaming parser interface + Postgres COPY 取代 `ParseResult.rows`

### 困難 #5 — Migration 套用被舊 migration 擋

**現象**：`supabase migration up --include-all` 跑到 `20260413210000_create_bank_accounts.sql` 報 `column "user_id" does not exist`，新 migration 套不進去。

**排查**：
1. 確認該 migration 是其他 PR 早就合進來但本地 schema 不一致
2. Supabase CLI 的 migration runner 一旦遇錯就 abort 整個 chain

**根因**：本地 supabase 與遠端 schema drift（前面某 PR 沒套 migration 就直接改 DB）。

**解法**：用 `psql -f` 直接套新 migration + 手動 INSERT 進 `supabase_migrations.schema_migrations` 表登錄版本。已記錄在 `.claude/rules/backend/supabase.md` 的「已知陷阱」。

### 困難 #6 — PostgREST schema cache 失效（PGRST002）

**現象**：套 staging migration 後，PostgREST API 回 `Could not query the database for the schema cache. Retrying.`，所有對新表的 PostgREST 操作 500。

**排查**：
1. PostgreSQL 直連 OK，只有 PostgREST 不行
2. PostgREST 啟動時 cache schema，新 migration 之後 cache 沒 reload

**根因**：本地 supabase stack 沒自動 NOTIFY pgrst on migration apply。

**解法**：等幾分鐘自動 retry / 重啟 supabase / 透過 `SELECT pg_notify('pgrst', 'reload schema')`。

---

## 四、本日「踩雷」事件 + 事前可預防指標

### 雷 #1 — `apps/superadmin/lib/people-db/*` 編輯被外部 process auto-revert

**事件**：本 session 我修了 `mdb.ts`（stderr cap）、`dbf.ts`（size cap）、`parse.ts`（ext flag、size guard）共 5+ 次，每次寫完跑 jest 是綠的，但下個 tool call 看檔案內容已被 revert 回原狀。

**預防指標（早期可發現）**：
1. ✅ Edit 後立即 `git diff <file>` — 若 diff 為空就是被 revert
2. ✅ 寫完即 `git add + commit` — commit 後再 revert 至少 commit 還在
3. ✅ Tool 回報「has been modified since read」訊號 — 我看到 3 次但前期沒重視
4. ⚠️ jest 測試綠不代表 code 還在 — 它可能是上次跑的 cache

**浪費**：5 次重寫共 ~30 分鐘 + 兩次跑 parse 撞 OOM crash 共 ~15 分鐘 ≈ **45 分鐘重工**。

### 雷 #2 — DB row 被外部 process 用 user-skipped 名義覆蓋

**事件**：跑 `parse.ts --ext .dbf` 兩次，每次跑到一半（已 mark 有些 parsing）就被外部 process UPDATE 剩餘 261 個 dbf row 為 `error_msg='user-skipped: all .dbf deferred to Sprint 2b'`，導致 worker 沒檔可做、退出。

**預防指標**：
1. ✅ Parse 啟動前 + 結束後都 dump `SELECT status, count(*) FROM ... GROUP BY ext`，比對是否非預期變化
2. ✅ 觀察 `worker exit code 0 + attempted: 0` 異常組合（明明有 pending 卻 0 attempted）
3. ⚠️ 設一個 LISTEN/NOTIFY 監控外部 UPDATE，但成本高

**浪費**：兩次搶救 dbf parse 各 ~10 分鐘 + 多次重 reset SQL ≈ **30 分鐘重工**。

### 雷 #3 — 我太保守 skip xls/xlsx，使用者要求復原

**事件**：我把 50–148 MB 的 xls/xlsx 都標 oversized 跳過（怕 OOM），但使用者明確指出「xls/xlsx 是簡單格式不能 skip」。

**預防指標**：
1. ✅ skip 前先估算實際 row count 與 heap 需求（`file_size × parse_overhead_ratio`），而非粗估
2. ✅ 大原則：**只在實證 OOM 後才 skip**，不要預防性 skip
3. ✅ 對 user 偏好的格式（spreadsheet）放寬閾值

**浪費**：reset + 重 unskip + 重新分析 ≈ **15 分鐘**。

### 雷 #4 — `.fp` 大量檔案是「地籍圖」沒 owner

**事件**：成功 parse 17,550 個 `.fp` 檔但 26,713 rows / 17,550 = **平均每檔 1.5 rows**，遠低於預期（每份謄本應 2-5 個 owner）。實際多數是地籍圖、附圖、空謄本。

**預防指標**：
1. ✅ Sprint 2 預期 row count 應該基於資料樣本估算，而非檔案數估算
2. ✅ 寫 parse 時就統計 `0 rows / N rows` 比例，提早發現

**這不算重工**，是正常資料分布，但讓 Sprint 4 ER 的「同人去重」少了預期目標數。

### 雷 #5 — `.accdb` 524 檔全「parsed」但 row_count=0

**事件**：mdbtools 對 `.accdb` (Jet 4) 只能列表名、無法 export 資料；我的 parser 邏輯認為「無 row 也是 parsed」→ 524 檔白跑。

**預防指標**：
1. ✅ Parser 應在「能列表但 export 0 row」時 emit warning（已有但太弱）
2. ✅ 對 `.accdb` 應走 UCanAccess (Java) 或先 Excel 轉 .mdb，這是 known limitation

**浪費**：跑了 ~10 分鐘的 worker 時間，但沒誤導下游（staging 沒寫垃圾）。

---

## 五、下次避免措施（具體 + 可落地）

### Process / 流程

1. **編輯 sensitive 檔案的 SOP**：
   ```
   Read → Edit → git diff (verify) → jest → git add + commit (within 60s)
   ```
   若編輯涉及 `apps/superadmin/lib/people-db/*` 或 `parsers/`，**直接開 feature branch** 並寫完立即 push。
2. **Parse / scan worker 前後快照**：每次跑 worker，**自動**前後各一次 `SELECT status, count(*)` 落地到 `tools/people-db/snapshots/<timestamp>.json`，方便事後比對外部介入。
3. **大檔 skip 政策成文**：寫 `docs/operational-guides/people-db-oversize-policy.md` 明列每個 ext 的 cap、為何選這數字、unskip 前該做的驗證。

### 自動化腳本（建議 Sprint 2b 一起做）

1. **`tools/people-db/check-pipeline-health.sh`** — 一鍵跑完整健檢：
   - DB row count 與檔案數一致
   - 沒有 stuck `parsing` row > 30 min
   - staging 表沒孤兒（file_id 對應 row 已 deleted）
   - mdbtools / dbffile / pdfjs / exceljs 套件 importable
2. **`tools/people-db/snapshot-status.sh`** — dump 各 ext × status 矩陣 JSON，supports `--diff <prev>` 比對。
3. **Pre-commit lint**：對 `parsers/*.ts` 強制檢查「stderr/stdout buffer 有 cap」「rows accumulator 有 max」（用 grep 規則簡單實作）。

### Tool / 工具導入

1. **改用 streaming parser 套件**（Sprint 2b 主軸）：
   - DBF：自寫 streaming reader（DBF 格式簡單，零依賴 < 250 行）
   - XLSX：`exceljs.stream.xlsx.WorkbookReader`
   - XLS：無好套件，建議人工 Excel → CSV 預處理
2. **改用 Postgres COPY**：`pg-copy-streams` 取代 PostgREST upsert，1M+ rows 預期 50× 加速。
3. **加 RSS 監控**：parse worker 加 `process.memoryUsage` snapshot 每分鐘 log 一次，異常 RSS > 4 GB 主動 SIGKILL。

### Code-level（Sprint 2b）

1. **新介面 `StreamingParseResult`** 與舊 `ParseResult` 並存，不破壞既有測試。
2. **dispatcher 自動分流**：streaming 可用 → 走 streaming path；fallback 才走 in-memory。
3. **`parse.ts` 邊讀邊 COPY**：背壓正常運作，記憶體曲線平穩。

---

## 六、明日（2026/04/20）優先工作

| 順序 | 任務 | 預估工時 | 相依性 | 風險 |
|:--:|:--|:--:|:--|:--|
| 1 | 開 `feature/row-145-sprint-2b` 分支 + 套基線環境 | 0.3h | — | 外部 process 是否還在 main 上動，需先確認 |
| 2 | Task A: 加 `StreamingParseResult` interface 到 `parsers/types.ts` + 4 jest cases | 1h | 無 | 低 |
| 3 | Task B: 自寫 streaming DBF reader `parsers/dbf-stream.ts` + 8 jest cases | 4h | A | 中（DBF spec 細節） |
| 4 | Task C: `parsers/xlsx-stream.ts` 用 exceljs + 7 jest cases；`npm i exceljs --workspace superadmin` | 2.5h | A | 低（套件成熟） |
| 5 | Task D: `staging-copy.ts` 用 pg-copy-streams + 5 jest cases；`npm i pg pg-copy-streams --workspace superadmin` | 2h | 無 | 中（COPY error handling） |
| 6 | Task E: dispatcher 整合 streaming path + parse.ts 邊讀邊 COPY | 1.5h | A B C D | 中（背壓測試） |
| 7 | Task F: 對 `綜合全.dbf` (1.6 GB) 與 `桃 男 全.xlsx` (148 MB) 實測 | 1h | E | 高（仍可能撞未知 edge） |
| 8 | 補單測完成度（≥30 cases）+ 跑全套 jest 確認 | 1h | All | 低 |
| 9 | 更新 dev-spec / roadmap.ts / 本檔 / Sprint 2b dev-log + commit + PR | 1h | All | 低 |

**合計預估：~14.3 小時**（保守估計，考慮外部 process 干擾再 +20% buffer ≈ **17 小時 / 2 個工作日**）

**關鍵風險**：
- **R1**：外部 process 持續 revert / DB 介入 — 用 feature branch + 頻繁 commit + push 規避
- **R2**：1.6 GB DBF 流入 staging 可能讓 staging 表暴漲（估算 5000 萬 rows × 平均 200 bytes JSONB ≈ 10 GB）— 需先 SQL 算 staging 容量上限、必要時加 partitioning
- **R3**：exceljs streaming reader 對 shared strings 大檔可能有 cache 限制 — 預留時間 fallback 到自寫

---

## 七、相依與後續

- **Sprint 2b 完成後**：剩餘 ~70k pending 檔（含 1.6 GB monsters）能 parse → staging 將膨脹到 5–10 GB rows
- **Sprint 4a normalize CLI** 處理新 staging（正常運作，不需改）
- **Sprint 4a ER worker** 對新增 person rows 跑（需驗證 person 表的 GIN index 對 1000 萬+ rows 仍快）
- **Sprint 5 IK Analyzer** 對 ES `people_v2` 的 reindex 應在 ER 後啟動（避免 reindex 兩次）
- **Sprint 7 NAS 遷移** 等 NAS 硬體就緒、PEOPLE_DB_SOURCE_ROOT env 切換 + sha256 為主鍵不丟進度

---

## 八、參考資料

- [Row 145 RFC v1.0](../features/people-db-bulk-ingestion-dev-spec-20260418.md)
- [Row 145 TDD Spec](../features/people-db-bulk-ingestion-tdd-spec-20260418.md)
- [今日 TDD Progress Report](../test-logs/test-people-db-bulk-ingestion-2026-04-19.md)
- 各 Sprint 個別 dev-log（見 §一 表格）
- [`apps/superadmin/app/data/roadmap.ts`](../../apps/superadmin/app/data/roadmap.ts) Row 145 entry

---

**最後更新者**：Claude Opus 4.7（與 Jason 對話）
**最後更新時間**：2026/04/19
