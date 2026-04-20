# Handoff — Row 100 HTTP Adapter

> **產出時間**：2026/04/21
> **產出者**：Claude Codex 5.3（與 Jason 對話）
> **接手對象**：下一個 Claude session
> **承接內容**：延續 superadmin AI settings 的 CLI/HTTP adapter 比較功能，補完未提交實作並收斂驗證與 roadmap/doc 同步。
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt

---

```markdown
你是下一個接手此 repo 的 AI，請直接延續 Row 100「AI 服務設定」HTTP Adapter 比較功能。

## 1) 身分與硬性規範（必遵守）
- 回覆語言：繁體中文；程式碼註解：英文。
- TypeScript strict，禁止 `any`（依 `CLAUDE.md` 與 `.claude/rules/general.md`）。
- SQL 只能放 `supabase/migrations/`，檔名 `YYYYMMDDHHMMSS_description.sql`（依 `.claude/rules/backend/supabase.md`）。
- Jason 常在平行分支同時改檔；動工前、每次 commit 前都先 `git status` 避免覆寫。
- roadmap 進度更新檔在 `apps/superadmin/app/data/roadmap.ts`（Row 100）。

## 2) 專案位置
- Repo 絕對路徑：`/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA`

## 3) 目前 git 現況（已偵察）
- `git status --short`：
  - `M .claude/commands/commit-push-pr.md`
  - `M apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`
  - `M apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx`
  - `M apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx`
  - `?? apps/superadmin/app/superadmin/settings/api_key_and_model_setting/model-router-columns.tsx`
- `git log --oneline -10` 最新是文件/指令類提交；**本次 session 尚未 commit**（請你接手後自行整理 commit）。

## 4) 本次已完成的關鍵產出（未提交，請先讀）
- 先讀順序（建立脈絡）：
  1. `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx`
  2. `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`
  3. `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx`
  4. `apps/superadmin/app/data/roadmap.ts`（Row 100）
  5. `project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`

- 已落地內容（證據）：
  - 新增 HTTP sheet tab：`http-adapter-config`（`page.tsx` 有 `SettingsTab`/`TAB_IDS`/`SHEET_TABS` 對應）。
  - HTTP 分頁有獨立全測按鈕與批次執行（`runAllHttpAdapters` in `page.tsx`）。
  - HTTP 全測完成改為右上角 toast（`httpBulkToast` in `page.tsx`），不再 `window.alert`。
  - 共用表格欄位擴充 HTTP metrics（`adapter-config-columns.tsx` 的 `showHttpMetrics`、`ttftMs/e2eLatencyMs/httpStatus/successRateRecent`）。
  - API 支援 `mode=cli/http`（`route.ts` 有 `mode` 參數、`runHttpMode()`、統一回傳 metrics payload）。
  - HTTP 錯誤分類（`classifyHttpError()` in `route.ts`）與最近成功率（`runHistoryByAdapter` + `successRateRecent`）。

## 5) 已驗證基線（目前綠）
先在 repo root 執行：

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/apps/superadmin" && npx tsc --noEmit
```

補充：本 session 實測 `npx tsc --noEmit -p apps/superadmin/tsconfig.json` 為綠。

## 6) roadmap / spec 現況（已查證）
- Row 100 在 `apps/superadmin/app/data/roadmap.ts`，目前 `percentage: 97`、`lastModifiedDate: 2026/04/19`，尚未反映這次 HTTP adapter UI/API 變更。
- 既有 dev spec：`project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`。
  - 其「後續工作」提到 lint / nightly / baseline 測試，對這次 HTTP 比較功能可直接延伸。

## 7) 下一步任務拆解（請直接執行）
1. **功能完整性收斂**
   - 檢查 `page.tsx` 的 HTTP 全測摘要計算是否用最新 state（目前有 before/after runCount 邏輯，請驗證「嘗試啟動數」計算是否受 stale ref 影響）。
   - 驗證 HTTP tab 的比較卡指標（P50/P95、成功率、timeout、5xx）是否在「尚未跑任何測試」與「部分失敗」時有合理 fallback 顯示。

2. **API 行為驗證**
   - 實測 `route.ts`：
     - `POST /api/ai-settings/adapter-runs` with `mode=http`
     - `GET` 輪詢 with `mode=http`
     - `PATCH` 在 HTTP 模式僅允許 `stop`（目前邏輯如此，請確認前端沒有呼叫 pause/resume）。
   - 檢查 `activeRuns` in-memory 設計是否符合預期（server restart 後資料遺失可接受，但需明確記錄）。

3. **文件與進度同步**
   - 更新 Row 100 的 `percentage / lastModifiedDate / devLog`（加上本次 HTTP Adapter sheet + metrics + toast）。
   - 新增本次 dev-log / test-log（建議路徑）：
     - `project-process/dev-logs/dev-ai-settings-http-adapter-2026-04-21.md`
     - `project-process/test-logs/test-ai-settings-http-adapter-2026-04-21.md`

4. **測試補強（TDD 導向）**
   - 優先補 API 單元測試（至少 cover）：
     - `mode=http` 成功回傳 metrics
     - `classifyHttpError` 映射（timeout/429/5xx/4xx）
     - `successRateRecent` window 行為
   - 補 UI 測試（若現有測試框架已覆蓋此頁）：
     - 出現 `LLM Http Adapter調適` tab
     - HTTP 全測按鈕存在
     - 全測完成顯示 toast

## 8) 延後 / 待辦（這次沒做完）
- provider/model/time-window 篩選器（比較卡目前先是總覽，尚未加篩選控制）
- `Stability Score`（spec 提及，尚未明確實作欄位）
- 將 HTTP 量測資料持久化到 DB（目前多數為記憶體 + local snapshot）

## 9) 關鍵慣例與雷區
- Supabase import 路徑：
  - Server（RLS）常見：`@/lib/supabase/server`
  - Service role：admin only：`@/utils/supabase/admin`
  - 見 `.claude/rules/backend/supabase.md`
- RLS：所有表應啟用；管理端需有明確 service_role 理由。
- pre-commit 可能擋：
  - `scripts/check-staged-no-any.js`
  - `scripts/check-critical-deps.js`
  - `tools/testing/lint-adapter-model-ids.sh`
  - `tools/testing/validate-test-manifest.sh`
- 禁止降級 major（見 `.claude/rules/critical-deps.md`）：
  - React 19 / Next 16 / TypeScript 5 / react-leaflet 5

## 10) 驗收門檻（你完成本輪時需達成）
- HTTP tab 功能可完整操作（單筆 run、全測、toast、比較卡指標正常刷新）
- API `mode=http` 與 `mode=cli` 不互相污染，回傳 payload 欄位一致
- `npx tsc --noEmit` 綠
- roadmap Row 100 與 dev-log/test-log 同步更新
- commit message 用繁中，聚焦 why（例如：`feat(superadmin): 新增 HTTP Adapter 全測與比較指標`）

## 11) 動工前確認指令（先跑再改）
```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
git status --short
git log --oneline -5
```

動工前先跟我確認 Sprint 拆解，避免悶頭寫錯方向。
```

---

## 使用方式
1. 開新 session。
2. 複製上方 fenced code block 內容（從 ```markdown 到結尾 ```）。
3. 貼到新 session 第一則訊息，直接開始接手。

## 相關文件
- Roadmap：`apps/superadmin/app/data/roadmap.ts`（Row 100）
- 本次核心修改：
  - `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx`
  - `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx`
  - `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`
- 既有規格：
  - `project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`
  - `project-process/features/tdd-ai-settings-adapter-self-report-20260419.md`
- 規範：
  - `CLAUDE.md`
  - `.claude/rules/backend/supabase.md`
  - `.claude/rules/critical-deps.md`
  - `.claude/rules/backend/ai-adapter.md`
