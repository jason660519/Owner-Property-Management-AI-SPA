# Development Log Summary — Row 008 LLM Observability Console

## 2026-04-25 — Sprint 2: LiteLLM Refactor（Price Map + Instrumented Call Wrapper）

### 本日完成任務清單

- 閱讀 LiteLLM 官方文件，分析 proxy、callback、cost tracking、virtual keys 各功能對本專案的適用性。
- 評估架構選項，決定「借用 LiteLLM 理念，不引入 LiteLLM Proxy 或 Python SDK」——因為 85% 的 LLM call 走 CLI subprocess，proxy 攔不到。
- 建立 `lib/ai/llm-price-map.ts`：內建 35+ 主流模型定價快照（Anthropic / OpenAI / Gemini / xAI / Perplexity / DeepSeek / Qwen / OpenRouter），公開 `calculateCostUsd()` / `getModelPricing()` / `inferProvider()` / `normalizeModelId()` utilities。
- 建立 `lib/ai/instrumented-llm-call.ts`：`reportLLMUsage()` best-effort wrapper，任何 HTTP LLM call 完成後呼叫一行即可自動寫入 `llm_observability_invocations`（含 cost_usd 計算）。
- 更新 `app/api/ai-settings/model-research/generate/route.ts`：
  - 匯入 `reportLLMUsage`
  - `callAnthropic` 新增回傳 `tokensInput` / `tokensOutput`（從 API response usage 欄位讀取）
  - POST handler 在每次成功/失敗呼叫後 fire-and-forget `reportLLMUsage`
- 更新 `app/superadmin/dashboard/llm-monitor/actions.ts`：
  - `getOfficialPricingMap` 加上 LiteLLM bundled price map fallback：對 `ai_model_research_reports` 中找不到定價的模型，自動使用 bundled snapshot 填充 `official_input_price_per_1m`
- 建立 `app/api/llm-monitor/sync-prices/route.ts`：`GET` endpoint，與 LiteLLM GitHub 上游 JSON 比對，回報定價差異（供維護者定期執行確認 bundled snapshot 是否需要更新）。
- 建立 Sprint 2 DEV-SPEC：`project-process/features/llm-monitor-litellm-refactor-dev-spec-20260425.md`。
- TypeScript check 通過（`npx tsc --noEmit --project apps/superadmin/tsconfig.json`）。

### 交付物與完成度

| 檔案 | 狀態 |
|---|---|
| `lib/ai/llm-price-map.ts` | ✅ 完成 |
| `lib/ai/instrumented-llm-call.ts` | ✅ 完成 |
| `app/api/ai-settings/model-research/generate/route.ts` | ✅ 埋點完成 |
| `app/superadmin/dashboard/llm-monitor/actions.ts` | ✅ Price map fallback 完成 |
| `app/api/llm-monitor/sync-prices/route.ts` | ✅ 完成 |
| `project-process/features/llm-monitor-litellm-refactor-dev-spec-20260425.md` | ✅ 完成 |

整體狀態：Sprint 2 完成；Row 008 整體進度推進至 88%。

### 遭遇困難與根因分析

- **Paperclip CLI 生產 agent runs 仍無法直接追蹤**：Paperclip 在 Docker worktrees 中跑 `claude -p`/`codex exec` 等 CLI 指令，屬於完全外部的子程序。沒有 HTTP hook 可以攔截，token usage 不透明。根因：CLI adapter 的 token 資訊只存在於 CLI 程序的 stdout，而程序結束後 stdout 只有最終回應文字，不含 usage JSON（除非 CLI 支援 `--output-format json` 旗標）。
- **`buildMockResult` 型別問題**：型別從 `{ text, urls }` 改成 `EvaluatorResult` 後 `tokensInput` 存取正確，需同步更新 mock 函式回傳型別。已修正。

### 踩雷事件與預防指標

- 踩雷：LiteLLM Proxy 看起來很全能，但 proxy 攔截的是 HTTP 流量；CLI subprocess 走的是 OS-level 程序，完全不同路徑。
- 預防：新增 LLM 監控功能前先確認「這個 call 是 HTTP API 還是 CLI subprocess？」。

### 下次避免措施

- 不在同一個 PR 混合 proxy 架構與 callback 架構的程式碼，這兩者部署方式完全不同。
- `EvaluatorResult` 型別更新後，記得同步更新所有回傳該型別的函式（包括 mock 函式）。

### 明日優先工作項目與預估工時

- 補 `lib/ai/llm-price-map.ts` 單元測試（`calculateCostUsd` / `normalizeModelId` / `inferProvider`）：1 小時。
- 補 `lib/ai/instrumented-llm-call.ts` 單元測試（mock `logLLMObservabilityInvocation`，驗證 best-effort 不拋出）：1 小時。
- 評估 Claude CLI `--output-format json` 選項：若可行，可以在 `adapter-runs/route.ts` 的 `runCliAttempt` 中提取真實 token usage，補足 Paperclip 的最後一塊盲點：2 小時。
- Sprint 3 規劃：LiteLLM Proxy Docker sidecar（for HTTP calls only），virtual key budget enforcement。
## 2026-04-24 — Sprint 1: Trace/Eval Console MVP

### 本日完成任務清單

- 判定本工作沿用 Row 008「超級管理員AI LLM API效能監控」而非新增重複任務。
- 依 `docs/update-project-progress-guide.md` 補齊 Row 008 DEV-SPEC、TDD-SPEC、TDD Progress Report、unit/e2e 目錄。
- 參考 Langfuse / Phoenix 的 trace、span、evaluation、dataset/experiment 思路，將本專案設計收斂為內部 `llm-monitor` console。
- 啟動 Sprint 1：Trace/Eval Console MVP。
- 新增 `llm_observability_traces` / `llm_observability_invocations` migration。
- `llm-monitor` 新增 Trace Console 與 Evaluation Runs tabs，先彙整 native trace、adapter evaluation runs、legacy usage logs。
- 新增 `lib/ai/observability.ts`，封裝 best-effort trace/invocation 寫入。
- `insertAdapterEvaluationRun()` 寫入 `adapter_evaluation_runs` 後同步寫入 `llm_observability_invocations`。
- `/api/ai-settings/adapter-runs` 現在會把測試 Prompt 與上傳測試檔名帶到 adapter evaluation snapshot，再寫進 observability invocation。
- `/api/property-description/stream` 每次候選模型 call 會寫入原生 invocation，包含 prompt、raw/rendered output、evaluation、E2E、throughput、HTTP status、tokens。
- Trace Console 增加 Trace Detail sheet，單筆可查看完整 prompt、test file、raw output、rendered output、evaluation、錯誤與 latency metadata。
- `LLMMonitorClient.test.tsx` 新增 Trace Console render 測試。

### 交付物與完成度

- `/project-process/features/llm-observability-console-dev-spec-20260424.md`：完成。
- `/project-process/features/tdd-llm-observability-console-20260424.md`：完成。
- `/project-process/test-logs/test-llm-observability-console-2026-04-24.md`：完成初版。
- `/project-process/handoffs/handoff-row-008-llm-observability-console-20260424.md`：完成初版。
- `apps/superadmin/unit_test/008/`、`apps/superadmin/e2e/008/`：已建立。
- `supabase/migrations/20260424100000_create_llm_observability_traces.sql`：完成。
- `apps/superadmin/app/superadmin/dashboard/llm-monitor/*`：Sprint 1 UI / actions 完成。
- `apps/superadmin/lib/ai/observability.ts`：完成。
- `apps/superadmin/lib/adapter-evaluation-runs/insert-adapter-evaluation-run.ts`：完成 adapter write path。
- `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`：完成 test prompt / test file metadata 傳遞。
- `apps/superadmin/app/api/property-description/stream/route.ts`：完成 property-description write path。
- Trace detail sheet：完成。

整體狀態：In Progress；Sprint 1 MVP 約 82%。

### 遭遇困難與根因分析

- 既有監控資料分散在 `ai_usage_logs`、`ai_prompt_audit_logs`、`adapter_evaluation_runs`，欄位語意不同。
- 若直接在 UI 拼欄位，短期可用但長期會阻礙 workflow replay、eval attribution、prompt/model A/B 分析。
- 因此 Sprint 1 以 normalized console + 新 trace schema 併行，避免一次重寫所有 LLM call-site。

### 踩雷事件與預防指標

- 踩雷：把「每次 LLM request」當成唯一主體，會漏掉一次頁面操作內的多次 adapter / judge / fallback call。
- 預防指標：新增觀測欄位前先標註它屬於 trace、invocation、stream event、evaluation 或 artifact。

### 下次避免措施

- 不把 raw output、rendered output、test file 大內容全部塞進列表表格。
- 大內容走 detail drawer 或 artifact reference。
- Eval 不只存 pass/fail，需保留 evaluator prompt、judge model、score、explanation。

### 明日優先工作項目與預估工時

- 完成 `llm_observability_traces` / `llm_observability_invocations` migration：2 小時。
- 將 `adapter_evaluation_runs` 寫入 normalized invocation：2 小時。
- 將 `/api/property-description/stream` 寫入 trace/invocation：3 小時。
- 補 Row 008 unit + E2E smoke：2 小時。
