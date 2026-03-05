# 多模型共識謄本解析引擎 — 實作計畫

> **日期**：2026-03-02
> **狀態**：In Progress
> **作者**：Claude Opus 4.6

## TL;DR

將現有的「單模型解析」升級為「多模型平行解析 → 程式化共識 → 按需 AI 裁判」三階段架構。建立兩個獨立功能模組（`online_ocr_parse` 解析 + `online_ocr_judge` 裁判），新增 `ocr_parse_results` 表存每個模型原始輸出，`property_documents` 表存最終合併結果。透過 `Promise.allSettled()` 平行呼叫 2~3 個 vision 模型，用確定性演算法逐欄位多數決，僅在低信心欄位才呼叫裁判模型——兼顧品質與成本。

## 架構決策

| 決策項目 | 選擇 | 原因 |
|:---|:---|:---|
| 整體架構 | 平行解析 + 程式化共識 + 按需裁判 | 通常 3~4 次 API 呼叫，比 6 模型全量便宜且更快 |
| 模型角色劃分 | 兩個獨立功能模組 (`online_ocr_parse` + `online_ocr_judge`) | 各自管理模型清單，UI 最清晰 |
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

- **Phase 1**：平行解析（`Promise.allSettled()`）
- **Phase 2**：程式化共識（多數決 + 信心分數）
- **Phase 3**：按需裁判（僅在有衝突欄位時呼叫）

---

## Step 6：重構 parse-transcript.ts

- 抽出共用 `ai-api-callers.ts`
- `parseTranscriptWithAI()` 改為呼叫 consensus 引擎

---

## Step 7：裁判 Prompt 設計

存入 `ai_system_prompts`（module = `online_ocr_judge`）

---

## Step 8：UI 更新

- 三階段進度指示器
- 信心分數顯示
- 衝突欄位高亮

---

## Step 9：FeatureModuleSelector UI 調整

- 新模組出現在列表
- 提示文字

---

## Step 10：更新 roadmap.ts
