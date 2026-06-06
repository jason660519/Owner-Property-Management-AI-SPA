# DEV-SPEC — Row 008 Sprint 2：LLM Monitor LiteLLM Refactor

> Row ID: 008  
> Sprint: Sprint 2 — LiteLLM Refactor  
> Date: 2026-04-25  
> Author: Claude Sonnet 4.6  
> Status: In Progress

---

## 背景與動機

Sprint 1 完成了 Trace/Eval Console MVP，建立了三層 schema（trace / invocation / evaluation）與 `lib/ai/observability.ts` helper。但仍有三個核心缺口：

| 缺口 | 影響 |
|---|---|
| 定價表靠 `ai_model_research_reports` 手動維護 | 成本計算過期、不準確 |
| `model-research/generate` 與 `models/test` 等路由無埋點 | 這些 LLM call 在 Trace Console 完全不可見 |
| 每個路由需手動寫 observability 程式碼 | 未來新增路由容易遺漏、維護成本高 |

Sprint 2 以 LiteLLM 的理念（而非完整依賴）解決上述問題：**借用 LiteLLM 的 cost map + 建立內部 instrumented call wrapper**，不引入 Proxy 基礎設施。

---

## 架構設計

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP LLM Call Sites                       │
├────────────────────┬─────────────────────────────────────────┤
│  已追蹤（Sprint 1）│         未追蹤（Sprint 2 補齊）         │
│  property-desc     │  model-research/generate                │
│  adapter-runs      │  models/test                            │
│                    │  （未來新增路由自動覆蓋）                │
└──────────┬─────────┴──────────────┬──────────────────────────┘
           │                         │
           ▼                         ▼
┌──────────────────────────────────────────────────────────────┐
│          lib/ai/instrumented-llm-call.ts（新建）              │
│  callInstrumentedLLM(opts) →                                  │
│    1. fetch() LLM API                                         │
│    2. calculateCostUsd() via llm-price-map                    │
│    3. logLLMObservabilityInvocation() best-effort             │
│    4. return response                                         │
└────────────────────────┬─────────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           ▼                             ▼
┌──────────────────┐          ┌──────────────────────┐
│ lib/ai/           │          │ llm_observability_   │
│ llm-price-map.ts  │          │ invocations (Supabase)│
│ (新建)             │          └──────────────────────┘
│ bundled snapshot  │
│ + sync endpoint   │
└──────────────────┘
```

---

## 交付物清單

### 1. `lib/ai/llm-price-map.ts`（新建）

**職責**：
- 內建精簡定價快照（主流 20+ 模型）
- 公開 `calculateCostUsd(modelId, tokensIn, tokensOut)` utility
- 支援 provider prefix 正規化（`anthropic/claude-sonnet-4-6` → `claude-sonnet-4-6`）
- `syncLiteLLMPriceMap()` 從 GitHub raw 更新快照到 Supabase 快取表

**定價資料來源**：  
`https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json`

### 2. `lib/ai/instrumented-llm-call.ts`（新建）

**職責**：
- `callInstrumentedLLM(opts: InstrumentedCallOpts)` — 統一入口
  - 接受：provider、apiKey、model、messages、moduleKey、userId、traceContext
  - 發出 `fetch()` 請求到對應 API endpoint
  - 捕獲：startTime、endTime、tokens（input/output）、httpStatus
  - 計算：`costUsd = calculateCostUsd(model, tokensIn, tokensOut)`
  - 非同步寫入：`logLLMObservabilityInvocation()`（best-effort，不阻塞回應）
  - 回傳：`{ text, usage, costUsd, latencyMs }`

**支援的 providers**：
- `anthropic` → `https://api.anthropic.com/v1/messages`
- `openai` → `https://api.openai.com/v1/chat/completions`
- `google` → Gemini API
- `xai` → `https://api.x.ai/v1/chat/completions`
- `perplexity` → `https://api.perplexity.ai/chat/completions`
- `deepseek` → `https://api.deepseek.com/v1/chat/completions`

### 3. 路由埋點（更新既有路由）

| 路由 | 動作 |
|---|---|
| `model-research/generate/route.ts` | 各 provider call 改用 `callInstrumentedLLM()` |
| `models/test/route.ts` | 測試 call 改用 `callInstrumentedLLM()`（可選，低優先） |

### 4. `app/api/llm-monitor/sync-prices/route.ts`（新建）

- `GET` endpoint，供 cron 或手動觸發，從 LiteLLM GitHub 抓最新定價 JSON
- 更新 Supabase `llm_price_map_cache` table（若不存在則使用 in-memory 快照）
- 回傳更新的模型數量與時間戳

### 5. `actions.ts` 更新

- `getOfficialPricingMap()` 改用 `calculateCostUsd()` 取代 `ai_model_research_reports` join

---

## 資料庫變更

### 新表：`llm_price_map_cache`（選配，若選擇 DB 持久化）

```sql
CREATE TABLE public.llm_price_map_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        TEXT NOT NULL UNIQUE,
  input_cost_per_token  NUMERIC(20, 12),
  output_cost_per_token NUMERIC(20, 12),
  max_tokens      INTEGER,
  provider        TEXT,
  source          TEXT DEFAULT 'litellm',
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**備選**：將定價 JSON 直接以 `app_settings` key-value 快取，不另開表。Sprint 2 先用 in-memory bundled snapshot，不建表。

---

## 不做的事（本 Sprint）

- **不引入 LiteLLM Python SDK** — 避免 Python/Node 混用複雜度
- **不建立 LiteLLM Proxy Docker sidecar** — P3，需另立 Sprint
- **不替換 Supabase tables** — 現有 schema 保持不變
- **不追蹤 CLI 生產 agent runs** — 這些在 Docker 外部無法直接攔截；Sprint 3 評估透過 worktree 完成 webhook 補追
- **不追蹤 `models/test` 的診斷 call** — 這是 1-token 連線測試，成本極低，低優先

---

## 驗收標準

1. `lib/ai/llm-price-map.ts` 提供 `calculateCostUsd('claude-sonnet-4-6', 1000, 200)` 並回傳正確金額
2. `model-research/generate` 的每次 AI 生成可在 Trace Console 看到對應 invocation row
3. invocation row 含有 `cost_usd`（透過 price map 計算）、`provider`、`e2e_ms`、`tokens_input`、`tokens_output`
4. TS check 通過：`npx tsc --noEmit --project apps/superadmin/tsconfig.json`
5. 既有 Sprint 1 test 不回歸

---

## 後續 Sprint 計畫（參考）

| Sprint | 目標 |
|---|---|
| Sprint 3 | LiteLLM Proxy Docker sidecar（for HTTP calls only），virtual key budget enforcement |
| Sprint 4 | agent 完成 webhook → 補 token/cost 欄位 |
| Sprint 5 | cost_usd 欄位整合到 llm-monitor 總覽統計、月度預算警示 |
