# TDD Progress Report — Row 008 LLM Observability Console

> Row ID: 008  
> Date: 2026-04-24  
> Sprint: Sprint 1 — Trace/Eval Console MVP  
> Status: In Progress

## 本日完成任務清單

- 建立 LLM Observability Console 的 DEV-SPEC 與 TDD-SPEC。
- 建立 Row 008 專屬 unit / e2e 目錄。
- 規劃 trace/span 與 evaluation normalized view。
- 開始實作 `llm-monitor` Trace Console / Evaluation Runs tabs。

## 交付物與完成度

- DEV-SPEC：完成。
- TDD-SPEC：完成。
- Trace schema migration：進行中。
- Trace Console UI：完成 Sprint 1 MVP。
- Write path：adapter evaluation、adapter-run test prompt/file metadata 與 property-description stream 已接入原生 trace/invocation。
- Trace Detail：完成單筆 trace detail sheet，可查看完整 prompt、test file、raw output、rendered output、evaluation 與 latency。
- 測試：`LLMMonitorClient.test.tsx` 新增 Trace Console render/detail case；`property-description/stream` 既有 usage log 測試已適配觀測寫入。

整體完成度：82%。

## 驗證紀錄

- `npx tsc --noEmit --project apps/superadmin/tsconfig.json`：通過。
- `npm test --workspace superadmin -- LLMMonitorClient --runInBand --forceExit`：2 tests 通過。
- `npm test --workspace superadmin -- app/api/property-description/stream/route.test.ts --runInBand --forceExit`：3 tests 通過。
- `git diff --check`：通過。

## 遭遇困難與根因分析

- Context7 查詢 Langfuse/Phoenix 文件逾時。根因是外部 MCP 回應超過 120 秒。
- 現有 `ai_usage_logs` 與 `adapter_evaluation_runs` 欄位不完全一致。根因是過去分別為 usage monitoring 與 adapter evaluation 建表，尚未抽象成 trace/span。
- `property-description/stream` 目前是非真正 provider streaming，TTFT 暫無法精準量測；Sprint 1 先寫入 E2E 與 throughput，TTFT 留待 provider stream chunk 化後補。

## 踩雷事件與預防指標

- 風險：只擴充 usage log 會讓表格越來越胖，後續難以表達多 span workflow。
- 預防指標：新增功能必須能回答「trace 是誰、span 是誰、eval 綁在哪個 invocation」。

## 下次避免措施

- 外部框架文件只做模型參考，核心資料不依賴第三方平台。
- 每個 LLM call-site 新增欄位前先映射到 trace/invocation/evaluation 三層。

## 明日優先工作項目與預估工時

- 完成 trace schema migration 與 actions 查詢：2 小時。
- 將 Global Evaluation Test 的非 adapter batch report 與最近報告套用流程寫入 invocation：2 小時。
- 補 Row 008 E2E smoke：2 小時。
