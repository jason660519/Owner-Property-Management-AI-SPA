# TDD-SPEC — Row 008 LLM Observability Console

> Row ID: 008  
> Sprint: Sprint 1 — Trace/Eval Console MVP  
> Date: 2026-04-24

## 1. 測試目標

驗證 `llm-monitor` 能以 trace/eval 視角統一呈現 LLM 調用資料，並在沒有新 schema 資料時仍能從既有 `ai_usage_logs` / `adapter_evaluation_runs` 顯示可用資訊。

## 2. 單元測試

- `actions.ts`
  - `getLLMTraceConsoleRows()` 在新 trace 表查詢失敗時 fallback 至 legacy sources。
  - Adapter rows 正確映射 requested/effective model、raw/rendered output、evaluation、TTFT/E2E/http status。
  - Usage rows 正確映射 page path、module、provider/model、tokens/cost/status。

- `LLMMonitorClient.tsx`
  - hash `#trace-console` 啟動 Trace Console tab。
  - Trace Console 顯示 TTFT、E2E、Throughput、HTTP、Evaluation 欄。
  - Evaluation Runs tab 顯示 adapter run evaluation label/message。

## 3. 整合測試

- Server action 使用 service role 查詢不受 RLS 限制。
- 空資料時 Trace Console 顯示空表，不造成頁面 crash。
- legacy fallback 不依賴新 migration 是否已套用。

## 4. E2E 驗收

- 開啟 `/superadmin/dashboard/llm-monitor#trace-console` 後可看到 Trace Console tab。
- 切換到 `#evaluation-runs` 後可看到 Evaluation Runs tab。
- 表格搜尋可用 provider/model/module 關鍵字過濾。

## 5. 驗收標準

- TypeScript strict 無錯。
- `LLMMonitorClient.test.tsx` 或新增 Row 008 測試涵蓋 tab 與欄位。
- Trace Console 表格欄位寬度可 resize、可搜尋、可排序。
- roadmap Row 008 文件路徑與測試目錄齊備。
