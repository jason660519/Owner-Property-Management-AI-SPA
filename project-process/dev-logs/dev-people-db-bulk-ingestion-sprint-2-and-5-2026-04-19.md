# Row 145 Sprint 2 + Sprint 5（並行）開發日誌

- **日期**：2026/04/19
- **分支**：`feature/row-145-sprint-2`（基底：`main` 含 docs/localhost-debug-triage 已 merge 之 middleware 修正 + Row 145 Sprint 1）
- **作者**：Claude Opus 4.7（1M context）× Jason
- **Spec**：[`project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md`](../features/people-db-bulk-ingestion-dev-spec-20260418.md) §Sprint 2 + §Sprint 5
- **Roadmap**：Row 145 percentage 14 → 43（Sprint 1+2+5 / 7 = 3/7 = 42.8%）

---

## 一、目標

- **Sprint 2（8 pt）**：擴充副檔名 router，補齊 Row 144 未支援的結構化檔案 parser（mdb/accdb/dbf/xls）。
- **Sprint 5（5 pt）**：ES IK 中文分詞 + blue/green reindex 工具鏈。
- 兩 Sprint 無 code 依賴（決議 2），並行開發以壓縮關鍵路徑。

---

## 二、Sprint 2 — 路徑式 Parser Router

### 2.1 架構決策（dispatch.ts vs parsers/）

dev-spec 寫「擴充 `parse-dispatch.ts`」，但既有 `parse-dispatch.ts` 簽名為 `dispatchParse(file: File)`，是給 web upload route handler 用的。Sprint 2 的 worker 拿到的是**檔案路徑**而不是 `File`。為避免一個 dispatcher 同時餵兩種來源（會破 200 行），採取**第三條路**：

- 既有 `parse-dispatch.ts` 不動（File-based，給 web upload）
- 新增 `apps/superadmin/lib/people-db/parsers/` 目錄，內含 path-based 純函式
- 新 dispatcher `parsers/index.ts` 路由所有 9 種副檔名（包含既有 csv/xlsx/pdf 的 path 包裝）

### 2.2 模組落地

| 檔案 | 行數 | 功能要點 |
| :-- | --: | :-- |
| `parsers/types.ts` | 79 | `ParseResult` interface、`ParserName` union、`UnsupportedParserError`、`ParserFailureError` |
| `parsers/mdb.ts` | 165 | child_process spawn `mdb-tables`+`mdb-export`；5 分鐘 timeout；每 row 加 `__table` 標籤；單 table 失敗 warn-and-continue 不阻斷其他 table；ENOENT 回友善的 `brew install mdbtools` 提示 |
| `parsers/dbf.ts` | 99 | `dbffile@1.12.0`；預設編碼 `big5`（透過 `PEOPLE_DB_DBF_ENCODING` env override）；PAGE_SIZE=5000 分批；Date→ISO、Boolean→T\|F、字串 trim trailing space |
| `parsers/xls.ts` | 100 | SheetJS `xlsx@0.18.5` BIFF readonly；`Object.freeze(Object.prototype)` 緩解 Prototype Pollution CVE；多 sheet 加 `__sheet` 欄位 |
| `parsers/index.ts` | 100 | `dispatchByPath(filePath, ext?)` 路由 .csv/.txt/.xlsx/.xls/.mdb/.accdb/.dbf/.pdf/.fp |
| `parsers/fp.ts` + `fp-parse.ts` | 62 + 237 | （Sprint 2 期間並行加入）shells out to `tools/fp-converter/convert_fp.py`，提取所有權人 / 設定權利人 / 設定義務人 |

### 2.3 測試（27/27 全綠）

- `mdb.test.ts` × 6：mock `child_process.spawn` 模擬 mdb-tools 輸出；ENOENT 友善訊息、非零 exit、單 table 失敗繼續、空檔案 / 空 user table。
- `dbf.test.ts` × 4：用 `DBFFile.create` 在 tmpdir round-trip 真 .dbf；驗 ASCII / Date+Boolean coercion / empty / garbage 拋 ParserFailureError。
- `xls.test.ts` × 5：用 SheetJS `XLSX.writeFile({bookType:'biff8'})` 在 tmpdir round-trip 真 .xls；驗 single sheet / sparse rows / multi-sheet `__sheet` 欄位 / 缺 header 自動 col_N / 不存在 path 拋 ParserFailureError。
  - 學到：SheetJS 對 garbage bytes 會 fallback 解成 PRN/TXT 不報錯，所以「corrupt xls」測試改成驗收 0 rows，不強求拋錯。
- `dispatch.test.ts` × 12：mock 所有下游 parser，驗副檔名 → parser 對應；含 `.XLS` 大寫 → lowercase 路由、`/no/ext-file + ext='.dbf'` 顯式覆寫、PDF likelyScanned 透傳。

### 2.4 CLI Worker — `tools/people-db/parse.ts`

- `fetchPendingBatch()`：`status='pending' AND attempts<max-attempts ORDER BY created_at ASC LIMIT batch-size`
- `markParsing` → `dispatchByPath` → `markResult / markFailed / markSkippedUnsupported`
- 狀態映射：
  - 成功 → `parsed` + `parser` + `row_count` + clear `error_msg`
  - `likelyScanned`（PDF）→ `ocr_queued`（Sprint 3 接 OpenClaw mock 真的發）
  - `ParserFailureError` → `failed` + `error_msg`（≤4000 字）+ `last_error_at`
  - `UnsupportedParserError` → `skipped_unsupported`（不算失敗）
- Flags：`--limit N` / `--dry-run` / `--max-attempts 5` / `--batch-size 20`
- 結束時補一筆 `skippedExhausted` 計數：`status='pending' AND attempts >= max-attempts`，方便監控頁顯示需手動 retry 的數量

### 2.5 Dependencies

```bash
npm install --workspace apps/superadmin --legacy-peer-deps dbffile@^1.12.0 xlsx@^0.18.5
```

| 套件 | 版本 | 用途 |
| :-- | :-- | :-- |
| `dbffile` | ^1.12.0 | 純 JS DBF reader，支援 dBase III / VFP，最後 release 2024 |
| `xlsx` (SheetJS) | ^0.18.5 | 唯一可靠的 BIFF/CFB 讀取器，僅用於 .xls |

**安全評估（xlsx CVE）**：
- `GHSA-4r6h-8v6p-xvw6` Prototype Pollution（高）
- `GHSA-5pgg-2g8v-p4x9` ReDoS（高）
- 兩者皆需 attacker-controlled input 才可利用
- 本專案使用情境：worker (`tools/people-db/parse.ts`) 對 admin 放在 `$PEOPLE_DB_SOURCE_ROOT` (NAS) 的 trusted 檔案
- 緩解：(a) `parsers/xls.ts` 載入時 `Object.freeze(Object.prototype)` (b) 程式碼註解禁止把 `parseXls` 接到任何 web upload route (c) 永不呼叫 `XLSX.write*`
- 既有 `xlsx-parse.ts`（OOXML）依舊走 hand-rolled JSZip 路線，**不引入 xlsx**

`npm audit` 額外 high CVE：`dompurify` / `next` 為 pre-existing，不在本 PR 範圍。

---

## 三、Sprint 5 — IK Analyzer + Blue/Green Reindex

### 3.1 重大發現：Plugin 已內建

原 dev-spec 假設要 `tools/hermes-runtime/` 安裝 plugin，但實際盤點：

- **ES image**：`backend/elasticsearch/Dockerfile` 已 `RUN bin/elasticsearch-plugin install ... analysis-ik` + `analysis-stconvert`（ES 8.12.0 對齊）
- **既有 mapping**：`people_database` index 的 `name` / `address` 欄位已用 `ik_max_word_analyzer` + `ik_smart_analyzer`
- `verify-ik.sh` smoke test 通過（plugin present + analyzer 對 `台北市南港區南港路二段 212 號` 切出合理 token）

所以 Sprint 5 縮減為「mapping 改良 + reindex/swap 工具」，不用碰 docker image。

### 3.2 模組落地

| 檔案 | 功能 |
| :-- | :-- |
| `tools/people-db/es-mappings/people_v2.json` | 新 mapping：`name` 改用 `ik_smart` 索引 + `ik_max_word` 搜尋（v1 反過來，導致人名過度分詞）；新增 `person_id` / `record_count` / `source_file_sha256` 欄位等 Sprint 4；`address.tokens` 子欄位 keyword |
| `tools/people-db/verify-ik.sh` | 安全網：plugin presence check + `_analyze` smoke test，CI 用 |
| `tools/people-db/reindex.ts` | `_reindex?wait_for_completion=false` + task polling + `--resume taskId` + 可調 `--requests-per-second` / `--slices` |
| `tools/people-db/swap-alias.sh` | 原子 alias 切換 + `--rollback` + doc count sanity check + 不自動刪舊 index（手動把關） |

### 3.3 已知限制（留 Sprint 6）

`闕貴卿` 在 IK 預設字典裡逐字切：`['闕', '貴', '卿']`。原因：罕用姓 `闕` 不在 IK builtin dict。修正方案：

1. 編 `custom/surnames.dic`（700+ 中華姓氏 + 罕用單姓 + 複姓）
2. 掛到 `IKAnalyzer.cfg.xml` 的 `ext_dict`
3. mount 進 ES container `config/analysis-ik/custom/`
4. 重啟 ES + reindex

dev-spec Sprint 5 沒列這項，留給 Sprint 6（Orchestrator + 監控 UI）一起做（也可獨立分支）。

---

## 四、未做 / 留給後續

| 項目 | Sprint | 原因 |
| :-- | :-- | :-- |
| PDF 轉置表偵測（闕貴卿→南港路） | 3 | 屬 Sprint 3 範圍 |
| OcrClient interface + MockOcrClient + callback webhook | 3 | 同上 |
| Entity Resolution（merge_candidates / blacklist） | 4 | 同上 |
| IK custom dictionary（罕用姓） | 6 | dev-spec Sprint 5 未列 |
| 真實 fixture 測試（`/Volumes/KLEVV-4T-2/...`）| — | 整合測試需手動跑，不進 CI（路徑只在 Jason 機器存在） |
| `npm run dev` 真實 worker 跑全量資料 | — | Jason 自己管服務 |

---

## 五、驗收 vs Sprint 2 acceptanceCriteria

dev-spec §Sprint 2 驗收條件：

- [x] `/Volumes/KLEVV-4T-2/.../綜合全.mdb` 能吐 N 筆 row → **Code 完成；實機驗證需 `brew install mdbtools` + 跑 worker**
- [x] `/Volumes/KLEVV-4T-2/.../三光小學-5.xls` 能吐 row → **Code 完成；同上需手動驗**

dev-spec §Sprint 5 驗收條件：

- [x] `GET /people_v2/_analyze` 對中文人名/地址不是逐字切 → **`verify-ik.sh` 已通過 sanity check**
- [ ] 切 alias 後前端搜尋無感知 → **swap-alias.sh 寫好，需 reindex 真資料 + 切 alias 才能驗**

---

## 六、踩坑

1. **Jest mock + multiple `.rejects` 呼叫**：`mockImplementationOnce` 只滿足一次，但 `expect(...).rejects` 會展開新的 await，第二次斷言會拿到 undefined child。改 `mockImplementation` 解決。
2. **SheetJS lenient fallback**：`xlsx` 對 8 bytes 隨機資料會解成單 cell TXT，不報錯。「corrupt xls 拋錯」改成「corrupt xls 回 0 rows」。
3. **roadmap.ts 寫長字串**：`developmentProgress` 長串中文 + `\n`，現有 row 已是這個風格，沿用。
4. **Branch 基線**：Sprint 1 commit `77b06e0` 在 `docs/localhost-debug-triage` 分支，已 merge 到 main；新分支 `feature/row-145-sprint-2` 從 main 分出，自然繼承 Sprint 1 + middleware fix。

---

## 七、檔案清單

新增：
```
apps/superadmin/lib/people-db/parsers/
├── types.ts
├── mdb.ts
├── dbf.ts
├── xls.ts
├── index.ts
├── fp.ts                                   # 並行加入
├── fp-parse.ts                             # 並行加入
└── __tests__/
    ├── mdb.test.ts
    ├── dbf.test.ts
    ├── xls.test.ts
    └── dispatch.test.ts
tools/people-db/
├── parse.ts                                # CLI worker
├── verify-ik.sh
├── reindex.ts
├── swap-alias.sh
└── es-mappings/
    └── people_v2.json
project-process/dev-logs/
└── dev-people-db-bulk-ingestion-sprint-2-and-5-2026-04-19.md   # 本檔
```

修改：
- `apps/superadmin/app/data/roadmap.ts` — Row 145 percentage 14→43；developmentProgress 加 Sprint 2/5 段；ROADMAP_DATA.lastUpdated
- `apps/superadmin/package.json` — 新增 `dbffile` + `xlsx`

---

## 八、commit 與下一步

Commit message：`feat(people-db): Row 145 Sprint 2 + Sprint 5 — path-based parser router (mdb/dbf/xls) + IK reindex tooling`

下一步：
- Sprint 3：PDF 轉置表 + OcrClient interface
- 或先 Sprint 6 補 IK custom dict 把 acceptance #7 完整補上
