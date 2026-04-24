# DEV-SPEC — Row 008 LLM Observability Console

> Row ID: 008  
> Sprint: Sprint 1 — Trace/Eval Console MVP  
> Date: 2026-04-24  
> Owner: Codex

## 1. 背景與目標

現有 `/superadmin/dashboard/llm-monitor` 已能呈現 LLM API 效能、token、成本、語音品質與最近使用紀錄，但資料模型仍偏向 usage log。工程師需要接近 Langfuse / Phoenix 的 trace/span 視角，能把一次頁面操作、一次 invocation、adapter execution、provider raw output、rendered output、evaluation、TTFT/E2E/throughput/http status 串起來。

Sprint 1 的目標是建立可落地的內部觀測 console：

- 在既有 `llm-monitor` 中新增 Trace Console 與 Evaluation Runs 視角。
- 先以既有 `ai_usage_logs`、`adapter_evaluation_runs` 做 normalized view。
- 新增原生 trace schema，供後續每個 LLM call-site 統一寫入。
- 保留 domain 欄位：page、company、adapter、invocation、execution、test prompt、test file、requested/effective model。

## 2. 設計原則

- Trace > flat log：一次使用者或系統 workflow 是 trace；provider call / adapter run / evaluator run 是 invocation/span。
- Raw 與 rendered 分離：raw output 用於 debug，rendered output 用於 QC 與產品體驗比對。
- Eval 是一等資料：evaluation label、score、message、judge model、evaluation latency 都可查詢。
- 低侵入：觀測寫入失敗不能阻斷實際 LLM 流程。
- 隱私保守：大 prompt / test file 預設存 hash、摘要或 artifact reference；完整內容只在明確需要時儲存。

## 3. 資料模型

新增兩張核心表：

- `llm_observability_traces`
  - `id`
  - `trace_key`
  - `page_path`
  - `company_id`
  - `company_name`
  - `module_key`
  - `invocation_name`
  - `execution_name`
  - `status`
  - `started_at`
  - `ended_at`
  - `metadata`

- `llm_observability_invocations`
  - `id`
  - `trace_id`
  - `source_kind`
  - `provider`
  - `adapter_id`
  - `adapter_model`
  - `requested_model`
  - `effective_model`
  - `input_prompt`
  - `test_prompt`
  - `test_file_name`
  - `raw_output`
  - `rendered_output`
  - `evaluation_label`
  - `evaluation_score`
  - `evaluation_message`
  - `ttft_ms`
  - `e2e_ms`
  - `throughput_tokens_per_s`
  - `http_status`
  - `tokens_input`
  - `tokens_output`
  - `cost_usd`
  - `status`
  - `error_message`
  - `started_at`
  - `ended_at`
  - `metadata`

## 4. UI 架構

`/superadmin/dashboard/llm-monitor` 保持為統一入口，BottomSheetTabs 擴充：

- 總覽
- Trace Console
- 使用紀錄
- Evaluation Runs
- 模型比較
- Token 趨勢
- 語音品質
- 預算與密鑰

Trace Console 使用 `EnhancedTable`，欄位優先服務工程除錯：

- 時間、Page、Company、Invocation、Execution
- Provider / Adapter / Model
- Requested / Effective Model
- Status / HTTP
- TTFT、E2E、Throughput
- Tokens、Cost
- Evaluation
- Raw / Rendered 摘要

## 5. 後續整合點

- `lib/ai/audit.ts`：將 prompt audit 與 trace/invocation 關聯。
- `property-description/stream`：在 stream chunk 寫 TTFT / raw delta summary。
- `adapter-evaluation-runs`：將現有 adapter run 同步寫入 invocation 表。
- `evaluations-global-test`：保存 test prompt / test file / judge result。

## 6. 風險與限制

- 現有資料不一定有 company/page/test file，所以 Sprint 1 會顯示 `-` 或 fallback 欄位。
- Raw output 可能很大，初期只在列表顯示摘要；完整保留策略需另外做 artifact storage。
- 若每個 stream chunk 都入 DB，寫入量會過大；建議只記 TTFT、E2E、final raw output，chunk event 留 debug sampling。
