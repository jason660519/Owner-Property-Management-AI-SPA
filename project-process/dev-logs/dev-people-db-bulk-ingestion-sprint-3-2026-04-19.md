# Row 145 Sprint 3 — PDF Transposed Table + OCR Mock Queue Dev Log

- **Date**: 2026-04-19
- **Developer**: Claude Opus 4.7
- **Branch**: `feature/row-145-sprint-2`
- **Parent dev-spec**: [people-db-bulk-ingestion-dev-spec-20260418.md](../features/people-db-bulk-ingestion-dev-spec-20260418.md) §Sprint 3
- **Parent tdd-spec**: [people-db-bulk-ingestion-tdd-spec-20260418.md](../features/people-db-bulk-ingestion-tdd-spec-20260418.md)

## 交付摘要

Sprint 3 收斂為兩條並行軸：

1. **PDF text-layer 品質改善**（任務 A）：修 `stitchTextItems` 的 y-tolerance bug（1px → 3px，含 x-order 還原），加 `detectTransposedTable` / `transposeTable` heuristic 與 10 個單元測試
2. **OCR pipeline 骨架**（任務 B/C/D）：`OcrClient` interface、`MockOcrClient`、`dispatchOcr` helper、OCR callback webhook（HMAC-SHA256 簽名）、端到端 integration test；migration 加 `ocr_job_id` / `ocr_provider` / `ocr_submitted_at` 三欄

總測試：**170 tests**（168 pass + 2 skipped integration，`RUN_INTEGRATION=1` 時 2/2 pass）、tsc 0 errors。

---

## 關鍵決策

### 1. 闕貴卿 bug 改走 OCR path，放棄 text-layer grid rebuild

**背景**：acceptanceCriteria #3 要求「里長 PDF 解析後 闕貴卿 對到南港路 212 號 2 樓」。

**發現**：真實里長 PDF（`/Volumes/KLEVV-4T-2/台灣尋人資料庫/台北市里長/*.pdf`）不是轉置表，而是 **grid-based spatial layout**——每個 column（x）= 一個欄位，column 內按 y 分：頂部 = 欄位名（垂直漢字）、下方 = 4 個人的值。text-layer 裡每個漢字都是獨立 item，baseline 有 sub-pixel 漂移。

**選項評估**：
- A1：寫 `extractGridTable(items)` 從 raw pdfjs items 重建 column/row grid（+1-2 天）
- A2：承認 text-layer 對這類 PDF 不適用，改走 OCR path；Sprint 3 專注 OCR 骨架，闕貴卿 bug 的真正修復延到真實 OpenClaw 上線後
- A3：標為 TODO 移 Sprint 4

**決議（Jason 2026-04-19）**：走 A2。理由：(a) 里長 PDF 排版每份可能不同、grid rebuild 通用性差；(b) OCR 對掃描式排版更穩；(c) Sprint 3 的 B/C/D 正好是 OCR queue，集中火力。

**保留物**：
- `stitchTextItems` y-tolerance 3px 修正是通用改進，對所有 PDF 都有效，保留
- `pdf-transposed.ts`（`detectTransposedTable` + `transposeTable`）對真正的轉置表（mock 測試 pattern）仍有效，保留作為工具函式；里長 PDF 由於 layout 本質不匹配，不會觸發
- acceptanceCriteria #3 重新定義：「當 OCR 流程接上 OpenClaw 後，闕貴卿→南港路 212 號 2 樓」，真正驗收移至 Sprint 6+

### 2. OCR callback 用 HMAC-SHA256 對 webhook 驗證模式對齊

Header 格式 `x-ocr-signature: sha256=<hex-digest>`，body 是 raw text；secret 從 env `OCR_CALLBACK_SECRET` 讀取，unset 時 webhook 回 500（hard-fail 而非靜默接受 unsigned callback）。

`MockOcrClient` 的 `simulateCallback(jobId, pages)` 是 test helper，生產 webhook 呼叫者是真實 OpenClaw（Sprint 6+）。

### 3. Integration test gating 從 `.integration.test.ts` 後綴 → env gate

原本打算用 jest config 的 `testPathIgnorePatterns: '\\.integration\\.test\\.ts$'` 來 skip，但 override 那個 pattern 會把 `e2e/` 也解鎖，導致 Playwright specs 誤跑。改用**檔名 `.test.ts` + 內嵌 `process.env.RUN_INTEGRATION === '1'` gate**：

```ts
const describeIntegration = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;
```

Default `npx jest ... ocr-pipeline.test.ts` → 2 skipped；`RUN_INTEGRATION=1 npx jest ...` → 2 pass。

### 4. Staging table 延到 Sprint 4，OCR 結果暫寫 error_msg marker

OCR 結果（pages[].text）的正式 staging 是 Sprint 4（Entity Resolution）的範疇。Sprint 3 的 callback 只把 `status='parsed' + parser='ocr' + row_count=pages.length + error_msg='OCR_RESULT_FOR_SPRINT_4'` 寫回，等 Sprint 4 建完 `people_db_staging_records` 表再 backfill。

---

## 交付清單（檔案）

### 新增

| 檔案 | 用途 |
| :--- | :--- |
| `apps/superadmin/lib/people-db/parsers/pdf-transposed.ts` | `detectTransposedTable(lines)` / `transposeTable(matrix)` / `linesToMatrix(lines)` 純函式 |
| `apps/superadmin/lib/people-db/parsers/__tests__/pdf-transposed.test.ts` | 10 cases |
| `apps/superadmin/lib/people-db/ocr/types.ts` | `OcrClient` / `OcrJob` / `OcrResult` / `OcrPage` / `OcrProviderId` interfaces |
| `apps/superadmin/lib/people-db/ocr/mock-client.ts` | `MockOcrClient` with `enqueue` / `onResult` / `simulateCallback` |
| `apps/superadmin/lib/people-db/ocr/client-factory.ts` | `getOcrClient(provider)` + `parseProviderFromEnv(raw)` |
| `apps/superadmin/lib/people-db/ocr/dispatch.ts` | `dispatchOcr(db, target, client)` — 讀檔 + enqueue + DB update |
| `apps/superadmin/lib/people-db/ocr/__tests__/mock-client.test.ts` | 5 cases |
| `apps/superadmin/app/api/people-db/ingest/ocr/callback/route.ts` | POST webhook：HMAC verify → lookup by `ocr_job_id` → status='parsed' |
| `apps/superadmin/app/api/people-db/ingest/ocr/callback/__tests__/route.test.ts` | 7 cases（200/401/400/404/500 config error） |
| `apps/superadmin/lib/people-db/__tests__/ocr-pipeline.test.ts` | Integration test（gated on `RUN_INTEGRATION=1`）：enqueue → ocr_queued → simulateCallback → parsed |
| `supabase/migrations/20260419053015_add_people_db_files_ocr_columns.sql` | ALTER TABLE + ocr_job_id 部分索引 |

### 修改

| 檔案 | 變更 |
| :--- | :--- |
| `apps/superadmin/lib/people-db/pdf-parse.ts` | `stitchTextItems` 改 y-bucket（tolerance 3px）+ x-sort；`parsePdfTabular` 在 delimiter 後加 transposed-table 分支 |
| `apps/superadmin/lib/people-db/__tests__/pdf-parse.test.ts` | 加 3 cases（per-char stitch / sub-pixel drift / x-order restore） |
| `tools/people-db/parse.ts` | `likelyScanned===true` 分支改呼叫 `dispatchOcr()`，由 env `PEOPLE_DB_OCR_PROVIDER=mock\|openclaw` 決定 client |

### Post-Sprint-2 cleanup commit（`8032a7e`）

- `parsers/mdb.ts`：移掉 mdb-export 的 `-H` flag（`-H` 是 suppress header 不是 include）
- `parsers/__tests__/mdb.test.ts`：regression test 防 `-H` 重新混入
- `lib/people-db/__tests__/fp-parse.test.ts`：FP parser unit tests（Sprint 2 尾巴 untracked）
- `lib/people-db/pdf-parse.ts`：pdfjs-dist v4 workerSrc fix（v4 在 `disableWorker:true` 下仍驗證 workerSrc truthiness）

---

## 測試總覽

| Suite | Cases | 狀態 |
| :--- | :--- | :--- |
| `pdf-transposed.test.ts`（新） | 10 | ✅ |
| `pdf-parse.test.ts`（+3） | 7 | ✅ |
| `mock-client.test.ts`（新） | 5 | ✅ |
| `callback/route.test.ts`（新） | 7 | ✅ |
| `ocr-pipeline.test.ts`（新 / integration） | 2 | ⏭️（`RUN_INTEGRATION=1` 時 2/2 pass） |
| people-db regression total | 168 pass + 2 skip | ✅ |
| `tsc --noEmit`（superadmin） | — | ✅ 0 errors |

---

## 已知限制 / Sprint 4+ 待辦

1. **闕貴卿 integration 驗收**：需真實 OpenClaw 接上後才能執行；Sprint 3 只到 mock pipeline
2. **OCR staging table**：callback 目前把 page text 丟棄，只寫 marker；Sprint 4 建 `people_db_staging_records` 表後要改 callback 把 pages 寫進去
3. **OpenClawOcrClient**：`client-factory.ts` 的 `'openclaw'` 分支目前 throw，Sprint 6+ 實作（對接 `feature/openclaw-migration` 後）
4. **Stale-job 告警**：`ocr_submitted_at` 欄位預留給監控 UI（Sprint 6 監控頁），Sprint 3 不做告警邏輯
5. **HMAC secret 輪換**：現為單 secret，未來如要多 provider 或密鑰輪換需調整
6. **pdf-transposed 測試對真實 PDF 無整合測試**：mock tests 有效、真實 PDF 的 grid layout 不觸發此 path，所以 `detectTransposedTable` 實戰在 Sprint 3 等同 dead code；若未來其他來源真的是轉置排版，此模組即可用

---

## Sprint 進度

- Sprint 1 ✅（2026-04-19 commit `77b06e0`）
- Sprint 2 ✅（2026-04-19 commit `059fa51`）
- Sprint 5 ✅（同 `059fa51`）
- Sprint 3 ✅（本 commit — post-cleanup `8032a7e` + sprint-3 `<TBD>`）
- Sprint 4 ⏳（Entity Resolution：`people_db_persons` / `merge_candidates` / `blacklist` + admin 頁）
- Sprint 6 ⏳（監控頁 + custom IK dict）
- Sprint 7 ⏳（NAS 遷移）
