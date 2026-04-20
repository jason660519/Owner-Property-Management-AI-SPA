# Handoff — Row 100 CLI/HTTP Fallback Chain

> **產出時間**：2026/04/21
> **產出者**：Claude Opus 4.7（與 Jason 對話）
> **接手對象**：下一個 Claude session
> **承接內容**：Row 100「AI 服務設定」adapter CLI vs HTTP 比較功能 — 已落地純路徑降級鏈、合併 PR #61、branch 已清理。下一步為實機驗證與 roadmap / dev-log 同步。
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt。

---

```markdown
你是下一個接手此 repo 的 AI，請直接延續 Row 100「AI 服務設定」的實機驗證與進度同步。

## 1) 身分與硬性規範
- 回覆繁中、程式碼註解英文
- TypeScript strict，禁 `any`（依 `CLAUDE.md`）
- SQL 只放 `supabase/migrations/`
- 進度更新在 `apps/superadmin/app/data/roadmap.ts`（Row 100）
- Repo 絕對路徑：`/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA`

## 2) 本 session 已落地產出（PR #61 已 merged）
- Merge commit：`8d265c7`（2026-04-20T22:58:11Z）
- 主要設計：CLI 模式只鏈 CLI、HTTP 模式只鏈 HTTP，刪除 `runProviderFallback` 家族跨路徑 fallback；每個 adapter row 於 `adapter-config.ts` 自帶 `fallbackModels: string[]`；primary 失敗逐層降級直到成功或鏈尾。
- 檔案層面改動：
  - `apps/superadmin/lib/adapter-config.ts` — 型別加 `fallbackModels`，12 row 填鏈（Claude 鏈式 opus→sonnet→haiku→舊版；其他 provider 同家族降級）
  - `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts` — 新增 `runCliAttempt` / `runCliChain` / `runHttpAttempt` / `runHttpChain`；`modelSource` 標 `fallback-cli:N` / `fallback-http:N`；`retryCount` = 使用的降級層數
  - `apps/superadmin/lib/ai-key-validation/kilo-opencode-zen.ts` — `openCodeZenChatModelId` 翻譯表補 7 組 fallback slug
  - `apps/superadmin/lib/adapter-runs/adapter-run-meta-lines.ts` — meta-line regex 補降級鏈 log 格式
  - `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx` — 新欄「降級鏈」read-only
  - `apps/superadmin/lib/__tests__/adapter-config-fallback-models.test.ts` — 新測試：以 2026-04-21 `ai_key_validation_cache` snapshot 做離線漂移檢查

## 3) 已驗證基線
- `npx tsc --noEmit`：無錯
- `npx jest lib/__tests__ lib/adapter-runs/__tests__ app/superadmin/settings/api_key_and_model_setting/__tests__`：116 tests passed
- `npx eslint` 修改檔：無警告
- `bash tools/testing/lint-adapter-model-ids.sh`：11 entries OK（既有 opencode-glm-5-1 legacy exemption warning 非本次引入）
- CI（PR #61）：Critical dependency guard / Typecheck / Lint / GitGuardian 全綠

## 4) 未做的事（下一步任務）
1. **實機驗證 4 個情境**（請用 Jason 的 key 實測，可記錄到 `project-process/dev-logs/`）：
   - primary 成功路徑（modelSource=requested、retryCount=0）
   - primary 失敗降級到第 1 層（modelSource=fallback-cli:1 或 fallback-http:1、retryCount=1）
   - 降級鏈耗盡（log 應顯示 `CLI 降級鏈已耗盡` 或 `HTTP 降級鏈已耗盡`）
   - PATCH `stop` 在鏈中任一層中止（signal 判斷應觸發 loop 提前 return）
2. **Roadmap Row 100 進度更新**：
   - 依實測結果更新 `percentage`、`lastModifiedDate`、`lastModifiedBy`
   - 若進入 testing 階段，補 `testStatus` / `testCoverage` 等欄位
3. **Dev log 補記**（可選）：
   - 於 `project-process/dev-logs/` 新增 `dev-ai-settings-adapter-fallback-chain-2026-04-21.md`
   - 內容：設計動機（避免 CLI/HTTP 比較被跨路徑 fallback 污染）、踩坑、實測數據

## 5) Reference / 連結
- PR #61：https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/61
- 先前 handoff：`project-process/handoffs/handoff-row-100-http-adapter-20260421.md`
- 設定頁 URL：`http://localhost:3001/superadmin/settings/api_key_and_model_setting#adapter-config` 與 `#http-adapter-config`
- AI adapter 規則：`.claude/rules/backend/ai-adapter.md`
- 驗證 cache 取得方式：`psql` 或 MCP `postgres.query` 查 `ai_key_validation_cache`（snapshot 已 freeze 在 `lib/__tests__/adapter-config-fallback-models.test.ts` 裡，若 key 重新驗證後 cache 變動，記得一併更新 snapshot）

## 6) 已知阻塞
無。所有 CI pass、branch 已清理、main 已同步。
```

---

## 非接手者也能看的本次摘要

### 變更摘要

| 檔案 | 變更 |
| :-- | :-- |
| `apps/superadmin/lib/adapter-config.ts` | 型別加 `fallbackModels`，12 row 填鏈 |
| `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts` | 刪跨路徑 fallback，新增 CLI/HTTP 各自降級鏈 |
| `apps/superadmin/lib/ai-key-validation/kilo-opencode-zen.ts` | 翻譯表補 7 組 fallback slug |
| `apps/superadmin/lib/adapter-runs/adapter-run-meta-lines.ts` | meta-line regex 補降級鏈格式 |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx` | 新欄顯示降級鏈 |
| `apps/superadmin/lib/__tests__/adapter-config-fallback-models.test.ts` | 新測試：離線漂移檢查 |
| 其他 | Row 100 先前 session uncommitted 產出（HTTP sheet tab、HTTP 全測、classifyHttpError、successRateRecent 等）一併收斂 |

### 測試結果

- tsc / jest / eslint / lint-adapter-model-ids：全綠
- CI：PR #61 全綠 merged

### 阻塞 / 下一步

- **無阻塞**
- **下一步**：實機驗證 4 情境 → roadmap Row 100 更新 → （可選）dev-log 補記
