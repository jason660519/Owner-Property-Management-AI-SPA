# Development Log Summary — Row 008 LLM Observability Console

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
