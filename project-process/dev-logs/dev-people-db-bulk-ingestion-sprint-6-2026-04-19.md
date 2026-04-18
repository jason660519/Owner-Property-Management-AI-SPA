# Row 145 Sprint 6 — Ingestion Orchestrator + 監控 UI 開發日誌

**日期**：2026-04-19
**作者**：Claude Opus 4.7 × Jason
**分支**：`feature/row-145-sprint-6`（rebase 後 base = `origin/main` `93c6d55`，含 PR #32 `/api/supabase/sql` superadmin guard）
**Sprint 進度**：Row 145 從 85% 推到 95%（Sprint 7 NAS 遷移剩 5%）

---

## 交付清單

| 層 | 新增 / 修改 | 說明 |
| :-- | :-- | :-- |
| Migration | `supabase/migrations/20260419150000_create_people_db_ingest_runs.sql` | ingest_runs 單表 8 欄 + 2 indexes + RLS 4 policies |
| Pure fn | `apps/superadmin/lib/people-db/ingest-orchestrator.ts` | stagesToRun / resolveScriptPath / buildStageArgs helpers + runStage / runOrchestrator 依賴注入 async fns |
| CLI | `tools/people-db/ingest.ts` | 薄殼 argv + createClient + SIGINT→AbortController + spawn 真實 child_process |
| API route | `apps/superadmin/app/api/people-db/ingest/retry/[fileId]/route.ts` | POST 單檔 retry failed→pending |
| API route | `apps/superadmin/app/api/people-db/ingest/stage-counts/route.ts` | GET N=11 parallel HEAD counts |
| API route | `apps/superadmin/app/api/people-db/ingest/runs/route.ts` | GET top-N ingest_runs by started_at DESC |
| Page | `apps/superadmin/app/superadmin/settings/people-database/ingest/page.tsx` | `IngestDashboardWorkspace` 三 section（stage cards / failed files / runs timeline）+ default export 包 DashboardLayout |
| Sidebar | `apps/superadmin/components/layout/nav-items.ts` | 加「尋人資料庫 — Ingestion 監控」(Activity icon) |
| Tests | 4 個測試檔共 17 新 cases | 詳見下方 §測試 |
| Manifest | `apps/superadmin/test-manifest.json` | Row 145 entry 更新 15 unitPaths + 2 e2ePaths，name 改 "Sprint 1–6" |
| E2E | `apps/superadmin/e2e/145/ingest-dashboard-flow.spec.ts` | page load + sidebar link smoke |
| Roadmap | `apps/superadmin/app/data/roadmap.ts` Row 145 | percentage 85→95、lastUpdated 改 Sprint 6、加 Sprint 6 developmentProgress 段 |

---

## 架構決策

### 1. Orchestrator 雙層設計（對齊 Sprint 4a entity-resolution.ts）

| 層 | 位置 | 職責 | 測試策略 |
| :-- | :-- | :-- | :-- |
| Pure helpers | `lib/people-db/ingest-orchestrator.ts` top | stagesToRun / resolveScriptPath / buildStageArgs | 直接 assert 輸入輸出 |
| Async orchestrator | 同檔 runStage / runOrchestrator | DB insert/update + spawn child + 等 close event | 注入 mock supabase + mock spawn（EventEmitter ChildProcess）|
| Thin CLI | `tools/people-db/ingest.ts` | parseArgs + createClient + SIGINT handler | 手動驗（Sprint 7 seed 後走完整 E2E）|

**關鍵**：CLI 薄殼不含測試邏輯，所有可驗證行為都在 `ingest-orchestrator.ts`。這讓 superadmin jest rootDir 可以覆蓋（tools/ 不在 jest testMatch 範圍）。

### 2. 審計表 ingest_runs 設計

| 欄位 | 規格 | 原因 |
| :-- | :-- | :-- |
| `stage` TEXT CHECK 6 態 | scan/parse/normalize/resolve/reindex/all | 'all' 讓未來可選擇性寫一筆 wrapper row（目前 runOrchestrator 每 stage 各一筆，不寫 wrapper）|
| `status` CHECK 4 態 | running/succeeded/failed/interrupted | 'interrupted' 語義 = SIGINT，與 'failed' 區分讓 dashboard 可用色彩區隔 |
| `processed` / `failed` INT | 預設 0 | Sprint 6 先預留欄位，實際填值由後續 stage CLI 自行 update（目前 orchestrator 只設 status 不碰 processed）|
| 2 indexes | `started_at DESC`（全量）+ partial `WHERE status='running'`（抓 stuck）| Dashboard 主查詢靠全量 DESC；監控 stuck stage 專用 partial 小索引 |

### 3. stage-counts 用 N=11 平行 HEAD count 而非 RPC

Supabase JS SDK 沒有 GROUP BY。三個選項：

1. 寫 SQL function RPC → 需另一個 migration、單元測試要跑真 DB
2. 平行 11 個 `count({ head: true }).eq('status', s)` → status 有 b-tree index，每個 query < 1ms；選這個
3. 拉全表 group by app side → 資料量大時爆記憶體

選 (2) 的代價是 status 集固定寫死在 API 檔 array（11 值），若未來新增狀態要同步改。用 `as const` 加 TS narrow 讓編譯期對齊。

### 4. Retry API 只允許 'failed' → 'pending'

最初寫時同時支援 `dead_letter`，但 grep `dead_letter` 發現只有我自己新檔引用，**schema `people_db_files.status` CHECK 沒有這態**。若硬推會讓資料不一致。撤回只保留 `failed`；未來若要支援 dead_letter 需：

1. migration 擴 `people_db_files.status` CHECK
2. parse worker 失敗 attempts 達上限時 flip `failed → dead_letter`
3. retry API 的 `RETRIABLE_STATUSES` Set 加 dead_letter

測試第 5 case (`skipped_unsupported` → 400) 是 regression guard，確保 retry 不繞開 skipped gate。

### 5. 監控頁 TanStack Query？否

Sprint 4b 已 grep 確認 `apps/superadmin` 完全沒用 `@tanstack/react-query`。繼續沿用 `useState + fetch + useEffect` pattern，與 `merge-candidates/page.tsx` 對齊。retry button 用樂觀移除（setFailedFiles filter）+ notice banner，跟 merge-candidates 決定行為一致。

Workspace 從 default export 抽出的原因：DashboardLayout 會拉一堆 chrome（sidebar / breadcrumbs / auth check），測試 render 它成本太高且雜訊多。split 後 `IngestDashboardWorkspace` 可 jsdom 渲染且無 layout side effects。

---

## 測試

### 新增 17 cases（jest 234 → 251）

| 檔 | cases | 重點 |
| :-- | :-- | :-- |
| `lib/people-db/__tests__/ingest-orchestrator.test.ts` | 9 | stagesToRun × 2 / resolveScriptPath / buildStageArgs × 2 / stage=scan 單次 spawn / stage=all 四次 spawn 順序 + 4 對 insert/update / non-zero exit→failed 含 "exit code 2" notes / AbortSignal→interrupted 含 notes='SIGINT' |
| `app/api/people-db/ingest/retry/[fileId]/__tests__/route.test.ts` | 5 | 401 unauth + admin 不被呼叫 / 200 failed→pending / 404 missing / 400 parsed / 400 skipped_unsupported |
| `app/superadmin/settings/people-database/ingest/__tests__/IngestDashboard.test.tsx` | 3 | stage cards 渲染 42/1500/5 / retry button → POST /retry/{fileId} / runs timeline 顯示 failed + succeeded 含 notes |

合計：jest 251 passed + 2 skipped（整合測試 gated on RUN_INTEGRATION=1）。

### 踩坑

**Card 初始 render 值 → findByTestId 時機錯誤**（IngestDashboard 測試 case 1）：

```ts
// ❌ 錯：counts 初始 state 是 {}，card 馬上 render 0；findByTestId 立刻滿足但值還是 0
const pendingCard = await screen.findByTestId('stage-count-pending');
expect(within(pendingCard).getByText('42')).toBeInTheDocument();

// ✅ 對：用 waitFor 等 fetch resolve 後 re-render
await waitFor(() => {
  const pendingCard = screen.getByTestId('stage-count-pending');
  expect(within(pendingCard).getByText('42')).toBeInTheDocument();
});
```

教訓：當 element 存在於初始 render 但文字值要等資料才正確時，不能用 `findByTestId`，要用 `waitFor(() => getByText)`。

### Regression

`npx jest 'lib/people-db|app/api/people-db|app/superadmin/settings/people-database'` → 31 passed + 1 skipped / 251 pass + 2 skipped（+17 vs Sprint 4b baseline 234）。

`npx tsc --noEmit` → 0 errors。

`bash tools/testing/validate-test-manifest.sh` → ✅ 21 entries。

---

## Rebase 記錄

對話期間另一個 AI 同事為了修 PR #31 / 開 PR #32（`/api/supabase/sql` superadmin guard），需要乾淨 working tree；他把本 Sprint 6 的 untracked 檔 stash 後切 `fix/supabase-sql-auth` 做完 commit 回來 pop 還原。流程紀錄：

1. 那位 AI stash -u Sprint 6 WIP（migration + ingest-orchestrator + CLI + 3 API routes + page.tsx + orchestrator test + retry test）
2. 切 `fix/supabase-sql-auth`（從 main 分）→ 實作 superadmin guard + 6 tests → commit bf07112 → push → PR #32
3. 使用者 merge PR #32 → `93c6d55` 進 main
4. AI 切回 `feature/row-145-sprint-6` → stash pop 還原 WIP（無 conflict）
5. 本 session 繼續：Sprint 6 base 從 main `c545cdf` rebase 到 `93c6d55`（拿到 PR #32 fix），stash 再 stash/pop 一次保留 WIP

PR #32 只動 `apps/superadmin/app/api/supabase/sql/`，和 Sprint 6 檔案零重疊，rebase 無衝突。

---

## 已知限制 / 延後項目

| 項 | 原因 | 負責 Sprint |
| :-- | :-- | :-- |
| Orchestrator cron 排程 | NAS cron 或 @scheduled-tasks 留到 Sprint 7 決定 | 7 |
| 真實 3 檔 fixture E2E（走完整 scan→parse→normalize→resolve）| 需 Supabase local + ES local + seed 資料齊發 | 7 |
| `dead_letter` 狀態加入 retry | 需先擴 `people_db_files.status` CHECK migration | 7 或之後 |
| Retry API reset `ocr_job_id` | OCR 失敗檔需另寫 retry 路徑處理 provider state（目前 retry 只 reset status/attempts/error_msg）| 7 |
| Person-mode search `total` 改為 person 聚合數 | 沿用 Sprint 4b 限制 | TBD |
| OpenClawOcrClient 真實串接 | 等 `feature/openclaw-migration` merge | 7 |
| 闕貴卿 acceptance #3 驗收 | 等 OCR provider 上線 | 7+ |
| `ingest_runs.processed / failed` 填值 | Sprint 6 orchestrator 只管 status，count 欄位預留給 stage CLI 自己 update | 後續增修 |

---

## Commit 計畫（不 push）

```
feat(people-db): Row 145 Sprint 6 — orchestrator CLI + ingest dashboard + retry API

- ingest_runs migration 20260419150000 + RLS 4 policies
- ingest-orchestrator.ts 純函式（runStage/runOrchestrator）+ tools/people-db/ingest.ts 薄殼 CLI
- POST /api/people-db/ingest/retry/[fileId]
- GET /api/people-db/ingest/stage-counts + /runs
- /superadmin/settings/people-database/ingest 監控頁 + Sidebar entry
- e2e/145 smoke + test-manifest 更新（15 unit + 2 e2e paths）
- roadmap Row 145 85 → 95 + Sprint 6 developmentProgress
- 新增 17 unit tests（jest 234 → 251 pass + 2 skipped）
```

**不 push / 不開 PR**，等 Jason 明確指示。

---

## 下一步（Sprint 7）

1. **NAS 遷移腳本**：PEOPLE_DB_SOURCE_ROOT env 切換 + sha256 主鍵保留進度
2. **Orchestrator cron**：NAS 系統 cron 或 `@scheduled-tasks` 接排程
3. **真實 OCR**：`feature/openclaw-migration` merge 後 swap `OpenClawOcrClient` 實作
4. **ES indexer**：resolved → indexed（目前 status 停在 resolved；需寫 worker 推進 ES）
5. **1 萬筆 seed fixture**：跑完整 acceptance #1–#10（含闕貴卿地址 #3 與轉置表 #4）
6. **dead_letter 狀態**（若需要）：migration 擴 CHECK + worker attempts 上限處理 + retry API 擴充
