# 多模型共識謄本解析引擎 — 實作計畫

> **日期**：2026-03-02
> **更新日期**：2026-03-07
> **狀態**：In Progress
> **作者**：Claude Opus 4.6 / GPT-5.4

## TL;DR

將現有的「單模型解析」升級為「多模型解析 → 程式化共識 → 按需 AI 裁判」三階段架構。建立兩個獨立功能模組（`online_ocr_parse` 解析 + `online_ocr_judge` 裁判），新增 `ocr_parse_results` 表存每個模型原始輸出，`property_documents` 表存最終合併結果。2026-03-07 起的實際執行策略已調整為：**以 OCP/OCJ 模組綁定作為單一事實來源，單次謄本解析最多使用 5 個成功解析模型 + 1 個成功裁判模型，並依 priority 做排序備援**，避免對大量候選模型全量呼叫造成 token 與時間浪費。

## 架構決策

| 決策項目 | 選擇 | 原因 |
|:---|:---|:---|
| 整體架構 | 有上限的多模型解析 + 程式化共識 + 按需裁判 | 單次最多 5 個成功解析 + 1 個成功裁判，兼顧品質、成本與穩定性 |
| 模型角色劃分 | 兩個獨立功能模組 (`online_ocr_parse` + `online_ocr_judge`) | 各自管理模型清單，UI 最清晰 |
| 單一事實來源 | 物件頁只讀取 `online_ocr_parse` / `online_ocr_judge` 模組綁定 | 避免與 `evaluations-global-test` 的大量候選模型耦合，減少使用者混淆 |
| 排序備援 | 依 `assigned_models.priority` 逐一遞補 | 前面模型臨時失效時，後續模型可自動接手，不必手動切換 |
| 結果儲存 | `property_documents` 存最終結果 + `ocr_parse_results` 存每模型原始輸出 | 最終結果方便查詢，原始輸出可追蹤除錯 |
| 向後相容 | 單模型配置時 fallback 到現有行為 | 不破壞既有使用流程 |

---

## Step 1：資料庫 Migration

**檔案**：`supabase/migrations/20260302120000_create_ocr_parse_results.sql`

### 新表 `ocr_parse_results`

| 欄位 | 型別 | 說明 |
|:---|:---|:---|
| `id` | UUID PK | `gen_random_uuid()` |
| `property_document_id` | UUID FK → `property_documents(id)` | CASCADE DELETE |
| `provider` | TEXT | 'openai' / 'anthropic' / 'gemini' / 'deepseek' / 'grok' |
| `model_id` | TEXT | e.g. 'gpt-4o' |
| `role` | TEXT | 'parser' / 'judge' |
| `raw_output` | JSONB | 該模型原始回傳的 `LandRegistryParsedResult` |
| `parse_duration_ms` | INTEGER | 單次解析耗時 |
| `token_usage` | JSONB | `{ prompt_tokens, completion_tokens, total_tokens }` |
| `error_message` | TEXT | 若呼叫失敗的錯誤訊息 |
| `created_at` | TIMESTAMPTZ | `now()` |

### `property_documents` 新增欄位

| 欄位 | 型別 | 說明 |
|:---|:---|:---|
| `parsed_result` | JSONB | 最終合併的結構化 JSON |
| `consensus_metadata` | JSONB | `{ strategy, field_confidences, conflicts, total_confidence, models_used, judge_used }` |
| `parse_strategy` | TEXT | 'single' / 'consensus' |
| `parsed_at` | TIMESTAMPTZ | 最後解析完成時間 |

---

## Step 2：TypeScript 型別定義

**檔案**：`apps/superadmin/lib/types/transcript.ts`（新增型別）

---

## Step 3：功能模組定義

**檔案**：`apps/superadmin/lib/ai-providers.ts`

- 將現有 `online_ocr` 改為 `online_ocr_parse`
- 新增 `online_ocr_judge`
- 更新 `MODULE_SORT_LABEL`

---

## Step 4：共識演算法核心

**新檔**：`apps/superadmin/lib/utils/transcript-consensus.ts`

### 共識規則

| 模型結果 | 信心分數 | 處理 |
|:---|:---|:---|
| 3/3 一致 | 1.0 | 直接採用 |
| 2/3 一致 | 0.67 | 採用多數，記錄分歧 |
| 全部不同 | 0.33 | 標記為衝突，待裁判 |
| 僅 2 模型成功 + 一致 | 0.8 | 採用，紀錄 1 模型失敗 |
| 僅 2 模型成功 + 不一致 | 0.4 | 標記為衝突 |
| 僅 1 模型成功 | 0.3 | 採用但低信心 |

---

## Step 5：多模型解析引擎

**新檔**：`apps/superadmin/lib/actions/consensus-parse.ts`

### 三階段流程

- **Phase 1**：排序解析 + 備援遞補（依 `priority` 順序呼叫）
- **Phase 2**：程式化共識（多數決 + 信心分數）
- **Phase 3**：按需裁判（僅在有衝突欄位時呼叫）

### 2026-03-07 實際執行策略

#### 解析模型（`online_ocr_parse`）

- 使用者可以在 OCP 欄位綁定很多模型並排序。
- 單次解析時，系統**不會**對全部模型同時發送 API。
- **目前已落地於 `/api/transcript-parse/stream` 路徑**：後端會依 `assigned_models.priority` 順序逐一呼叫模型：
  - 先用排序 `1~5` 的解析模型。
  - 若其中有模型失敗（API error / JSON 解析失敗 / 無金鑰），再依序遞補 `6, 7, 8...`。
  - 一旦累積 **5 個成功解析結果** 即停止呼叫後續模型。
  - 若全部候選用盡仍未滿 5 個成功，就以目前成功的結果進入共識階段。
- `apps/superadmin/lib/actions/consensus-parse.ts` 目前仍保留較早期的平行 `Promise.allSettled()` 版本，後續若要完全一致，需再同步改成同樣的排序備援策略。

#### 裁判模型（`online_ocr_judge`）

- 裁判不是重新解析整份謄本，而是只針對「有衝突欄位」做最終仲裁。
- 更精確地說：只有「**低信心且需要裁判的衝突欄位**」才會進入裁判階段；並非所有被記錄為 conflict 的欄位都一定送審。
- 裁判模型會看到：
  - 原始謄本文件
  - 衝突欄位清單
  - 各解析模型對衝突欄位的不同值
- **目前已落地於 `/api/transcript-parse/stream` 路徑**：後端依 `assigned_models.priority` 順序逐一嘗試裁判模型：
  - 先用排序 `1` 的裁判模型。
  - 若失敗，再依序遞補 `2, 3, 4...`。
  - 任一裁判成功就停止並套用其判決結果。
  - 若全部裁判失敗，則保留 Phase 2 的多數決共識結果。
- `apps/superadmin/lib/actions/consensus-parse.ts` 目前仍是「只使用第一個裁判模型」的舊版本，後續可再與 stream 路徑對齊。

#### 單一事實來源

- 物件編輯頁 `TranscriptParseSection` 顯示的解析模型，僅來自 `online_ocr_parse` 的模組綁定。
- 物件編輯頁顯示的裁判模型，**優先**來自 `online_ocr_judge` 的模組綁定；若未設定，UI 會暫時沿用本次已啟用解析模型中的第一個作為 per-run fallback。
- `evaluations-global-test` 的大量勾選模型只用於「AI 模型全域評測 / 模型評估」，**不再**直接影響單一物件的謄本解析模型數量。

#### 失敗防護

- 單一解析模型回傳畸形 JSON 時，只記為該模型失敗，不中斷整次解析。
- 裁判模型回傳畸形 JSON 時，僅記錄到 `ocr_parse_results.error_message`，不讓整體請求崩潰。
- 最終只要至少有一個解析模型成功，就能產生共識結果；裁判失敗時也能安全退回多數決結果。

---

## Step 6：重構 parse-transcript.ts

- 抽出共用 `ai-api-callers.ts`
- `parseTranscriptWithAI()` 改為呼叫 consensus 引擎

---

## Step 7：裁判 Prompt 設計

存入 `ai_system_prompts`（module = `online_ocr_judge`）

### 裁判的職責

- 裁判模型的功能是「**對衝突欄位做最終仲裁**」，不是替代 Phase 1 的解析模型。
- 典型場景：
  - 模型 A 說總面積是 `146.87平方公尺`
  - 模型 B 說是 `148.67平方公尺`
  - 模型 C 說是 `146.87`
  - 程式化共識會先標記此欄位為衝突或低信心
  - 裁判模型再對照原始謄本，輸出 `correct_value` 與 `reason`
- 因此裁判只在必要時被呼叫，目標是：
  - 降低 token 成本
  - 提高低信心欄位的正確率
  - 避免對整份文件做第二輪全量高成本解析

---

## Step 8：UI 更新

- 三階段進度指示器
- 信心分數顯示
- 衝突欄位高亮
- 解析設定面板顯示本次實際使用的解析模型與裁判模型
- 物件頁僅顯示 OCP / OCJ 模組綁定，避免與 AI 模型全域評測頁混淆

---

## Step 9：FeatureModuleSelector UI 調整

- 新模組出現在列表
- 提示文字

---

## Step 10：更新 roadmap.ts
