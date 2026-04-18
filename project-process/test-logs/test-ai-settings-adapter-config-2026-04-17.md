# AI Settings Adapter Config — TDD Progress Report

**Task ID**: AI-SETTINGS-ADAPTER-ROW100  
**Row ID（Development Tab 欄 1 編碼）**: `100`  
**Date**: 2026-04-17  
**Owner**: GPT-5.3-Codex

---

## 1) 本日完成之任務清單（含交付物與完成度）

1. **Adapter Config 真實執行鏈路落地**（完成度：92%）
   - 交付物：
     - `apps/superadmin/app/api/ai-settings/adapter-runs/route.ts`
     - 支援 `POST/GET/PATCH`（啟動/輪詢/暫停-恢復-停止）
     - 實作 child process run + stdout/stderr 採集 + PID 回傳
   - 結果：前端不再只是模擬 log，已可實際執行 CLI 並顯示執行狀態。

2. **API Key 雙來源策略（Supabase + process.env fallback）**（完成度：90%）
   - 交付物：
     - 後端載入並解密 `ai_api_keys`，缺值時回退 `.env`
     - 執行 log 顯示 key 來源（supabase/process.env）
   - 結果：排除「CLI 未吃到 key」黑箱，提升可觀測性。

3. **CLI 失敗自動 API fallback（五家 adapter）**（完成度：85%）
   - 交付物：
     - `apps/superadmin/lib/adapter-runs/fallback.ts`
     - `apps/superadmin/lib/adapter-runs/__tests__/fallback.test.ts`
     - `route.ts` provider fallback（claude/gemini/codex/kilo/opencode）
   - 結果：CLI 失敗時可自動切 API，避免流程直接中斷。

4. **模型解析與顯示改造（Resolved Model + render output）**（完成度：88%）
   - 交付物：
     - 前端新增 `Resolved Model`、`輸出結果（render）`、`測試ＯＫ` 欄位
     - 新增 `全測` 綠色一鍵按鈕
     - 新增狀態持久化（localStorage）
   - 結果：可讀性提升，驗收成本下降。

5. **全測結果持久化（local + Supabase）**（完成度：80%）
   - 交付物：
     - localStorage snapshot：保留 output/result/resolved/review 狀態
     - 雲端 snapshot：寫入 `ai_modules_assigned_function`（module key: `adapter_config_test_results`）
   - 結果：跳頁返回後仍可回復最近測試結果。

---

## 2) 技術/流程困難（現象 → 排查 → 根因 → 解法）

### 困難 A：模型名稱不相容，fallback 大量失敗
- **問題現象**
  - `model does not exist` / `invalid model ID` / `ProviderModelNotFoundError`
  - OpenCode/Kilo 多列看似不同模型，結果行為高度一致或全失敗。
- **排查過程**
  1. 比對 Adapter 表中 model 字串 vs provider API 實際可用模型。
  2. 檢查 `ai_key_validation_cache.available_models` 與 fallback 使用模型差異。
  3. 回看 raw logs 與 fallback 解析來源（requested/default）。
- **根因分析**
  - 把「CLI 顯示用 model label」直接當成 API model ID 使用，未經 provider 可用模型校正。
- **最終解法**
  - 建立 `resolveFallbackModel()`：優先 requested（若存在於 validation cache）→ 推薦可用模型 → default。
  - 對 OpenRouter 加入 family-aware 分流（Kimi/GLM/MiniMax/Qwen 優先匹配）。

### 困難 B：`gpt-5.*` 路徑錯誤導致 Codex fallback 失效
- **問題現象**
  - `This is not a chat model... Did you mean /v1/responses?`
- **排查過程**
  1. 比對 OpenAI 不同模型 API 路由需求。
  2. 追蹤後端 fallback endpoint 固定使用 `chat/completions`。
- **根因分析**
  - route 未依模型類型動態切 API endpoint。
- **最終解法**
  - 若模型為 `gpt-5.*`，fallback 改走 `/v1/responses`；其餘維持 `/v1/chat/completions`。

### 困難 C：CLI 成功碼不代表語義成功
- **問題現象**
  - process `code=0`，但 stderr 含 `Requested entity was not found` 與 debug 噪音。
- **排查過程**
  1. 對比 exit code 與輸出內容。
  2. 人工檢查多筆執行 log，確認「假成功」樣態。
- **根因分析**
  - 判斷條件僅看 exit code，缺乏語義失敗訊號檢測。
- **最終解法**
  - 補 `semantic failure` 判斷（error/status/tool-debug pattern）並觸發 fallback。
  - 新增 render output 清洗（去 ANSI、去 debug payload）。

---

## 3) 本日踩雷事件與可預防指標

1. **踩雷：先修 UI 交互，再補關鍵測試（重工）**
   - 影響：多次來回修正 fallback 與模型解析。
   - 事前可預防指標：
     - 新功能 PR 若無「失敗路徑」測試（模型不存在/endpoint 不符）即禁止合併。

2. **踩雷：把「配置名」當「可呼叫 model ID」**
   - 影響：多 provider 回退失敗、誤判系統穩定性。
   - 事前可預防指標：
     - 執行前若 model 不在 validation cache，直接標記 warning 並啟動解析器，不可直送 API。

3. **踩雷：CLI provider 預設 profile 汙染（非預期模型）**
   - 影響：多列結果同質化、難以驗證各 adapter 差異。
   - 事前可預防指標：
     - 每次 run 若 command 未帶 `--model`/`-m`，立即阻擋送出。

---

## 4) 下次避免措施（可落地）

1. **流程優化**
   - 在 Adapter run 啟動前新增 preflight：
     - 驗證 model 是否在 provider 可用清單；
     - 顯示最終 resolved model 與來源（requested/cache/default）；
     - 不通過時禁止啟動。

2. **工具導入**
   - 新增 `tools/ai-settings/check-adapter-model-map.ts`：
     - 比對 `ADAPTER_CONFIG_ITEMS` vs `ai_key_validation_cache`；
     - 產生 mismatch 報告（可接 CI）。

3. **自動化腳本需求**
   - 新增 nightly smoke：
     - 對每個 adapter 跑固定 prompt；
     - 收集 `CLI success / fallback success / fallback fail` 指標；
     - 出具報表並更新儀表板狀態。

4. **測試治理**
   - 擴充 TDD 測試矩陣：
     - `exit=0 + semantic failure`；
     - `model family mapping`；
     - `gpt-5 responses endpoint`；
     - `local/cloud snapshot restore`。

---

## 5) 明日優先工作（含工時、相依性、風險）

1. **Adapter model preflight + blocker UI**（4h）
   - 相依性：需讀取 validation cache 成功。
   - 風險：若 cache 空值比例高，需補強 fallback 提示文案。

2. **Adapter 結果同步狀態可視化（local vs cloud）**（2.5h）
   - 相依性：現有 snapshot 儲存機制。
   - 風險：多分頁編輯可能造成最後寫入覆蓋，需加版本戳。

3. **E2E：全測流程與結果持久化回歸**（4h）
   - 相依性：測試帳號、API keys、mock 可切換。
   - 風險：外部 provider rate limit 造成 flaky，需要 mock fallback。

4. **Paperclip / CEO 通知流程標準化**（1.5h）
   - 相依性：本機 `PAPERCLIP_*` env 與 API 可達。
   - 風險：若本機服務未啟動，需提供降級通知模板。

---

## 6) 任務狀態建議（Backlog / Todo / In progress / In Review / Done）

- **Done**
  - Adapter run API 基礎流程（start/poll/pause/resume/stop）
  - 全測按鈕、測試 OK 欄、結果 render 欄、resolved model 欄
  - local + cloud snapshot 持久化
- **In Review**
  - 多 provider fallback 路徑穩定性（特別是 OpenRouter family mapping）
  - gpt-5 responses 路由切換完整性
- **In progress**
  - 模型 preflight blocker 與 mismatch 提示 UX
- **Todo**
  - Adapter config 自動校對腳本（CI gate）
  - 全測 E2E 回歸測試
- **Backlog**
  - 失敗重試策略（帶退避/backoff）與成本上限守門

---

## 7) 本日第二階段：Kilo / OpenCode 金鑰 HTTP 驗證（TDD）與 DB 約束

> **對應 roadmap**：`超級管理員-AI 服務設定（API 金鑰與模型費用）` — **Row ID `100`**（Development Tab 欄 1 顯示之編碼）。  
> **TDD Progress Report（本檔）**：`/project-process/test-logs/test-ai-settings-adapter-config-2026-04-17.md`  
> **DEV-SPEC / TDD-Spec**：`/project-process/features/tdd-ai-settings-20260221.md`（沿用既有；本階段為擴充驗證行為）

### 7.1 本日完成之任務清單（交付物與完成度）

| # | 任務 | 交付物（路徑或產出） | 完成度 |
| :-: | :--- | :--- | :---: |
| 1 | **Kilo Gateway 真實金鑰驗證** | `apps/superadmin/lib/ai-key-validation/kilo-opencode-zen.ts` 之 `validateKiloGatewayKey`；`GET …/models` + 必要時 `POST …/chat/completions`（probe 優先使用列表第一個 model id） | **100%** |
| 2 | **OpenCode Zen 真實金鑰驗證** | 同上檔案之 `validateOpenCodeZenKey`；`GET https://opencode.ai/zen/v1/models` + Bearer | **100%** |
| 3 | **驗證 API 路由接線** | `apps/superadmin/app/api/ai-settings/keys/validate/route.ts`：`validateKilo` / `validateOpenCode` 改為呼叫上述函式，並以 `buildModelInfo` 產生推薦模型字串 | **100%** |
| 4 | **連線測試 API 接線** | `apps/superadmin/app/api/ai-settings/models/test/route.ts`：`testKilo` / `testOpenCode` 改為 OpenAI-compatible `chat/completions`（與其他 provider 卡片一致） | **100%** |
| 5 | **單元測試（mock fetch）** | `apps/superadmin/lib/ai-key-validation/__tests__/kilo-opencode-zen.test.ts`（6 cases：空金鑰、401、成功列表、Kilo 雙請求、probe 401） | **100%** |
| 6 | **DB：provider CHECK 擴充** | `supabase/migrations/20260417113000_add_kilo_opencode_provider.sql`（`kilo` / `opencode` 寫入 `ai_api_keys` 等表不再觸發 `ai_api_keys_provider_check`） | **100%**（遷移已於本機 Supabase 54322 驗證） |
| 7 | **UI 與設定一致性** | `apps/superadmin/lib/ai-providers.ts`：`kilo` / `opencode` 之 `baseUrl` 對齊實際 Gateway / Zen 基底 URL | **100%** |
| 8 | **本機 DB 連線對齊** | 專案根 `.env`：`DATABASE_URL` 指向 `127.0.0.1:54322`（與 `supabase/config.toml` 預設埠一致），避免誤用 `5432` 導致連線被拒 | **100%** |

### 7.2 技術或流程困難（現象 → 排查 → 根因 → 解法）

#### 困難 A：`ai_api_keys_provider_check` 導致無法儲存 Kilo / OpenCode

- **現象**：插入或更新 `ai_api_keys` 時 Postgres 回報 CHECK constraint violation。
- **排查**：比對 migration 中各 `ai_*` 表的 `provider` CHECK 列舉與應用程式 `AIProvider` union。
- **根因**：資料庫約束未含 `kilo`、`opencode`，與程式碼不同步。
- **解法**：新增 migration 一併擴充相關表之 CHECK；於目標環境執行 `db push` 或 `psql` 套用。

#### 困難 B：本機 `DATABASE_URL` 連線 `localhost:5432` 失敗

- **現象**：`connection refused` 或無法對齊預期 schema。
- **排查**：確認實際 Postgres 為 Supabase local（預設 **54322**）而非裸機 5432。
- **根因**：`.env` 沿用舊示範連線字串，與目前開發慣用之 Supabase local 埠不一致。
- **解法**：將 `DATABASE_URL` 改為 `postgresql://postgres:postgres@127.0.0.1:54322/postgres`（或依團隊 `config.toml` 調整），並在註解標示對應關係。

#### 困難 C：Kilo「僅格式驗證」導致 UI 顯示通過、實際無 HTTP 證明

- **現象**：金鑰驗證與連線測試對 Kilo/OpenCode 為 stub，與其他卡片行為不一致。
- **排查**：對照官方 Gateway / Zen 文件與既有 `validateOpenRouter` 等模式。
- **根因**：初期以 CLI Adapter 為主，HTTP 驗證未實作。
- **解法**：實作 `kilo-opencode-zen.ts` 並接入 `validate` / `models/test`；Kilo 在 `/models` 未拒絕匿名時以 **chat probe** 補強。

### 7.3 本日「踩雷」事件與事前可預防指標

| 踩雷 | 影響 | 可預防指標 |
| :--- | :--- | :--- |
| **程式已加 provider、DB 未 migration** | 儲存金鑰失敗、重工排查 | 新增 `AIProvider` 時，**同一 PR** 必須含 migration + 型別 + 驗證路由；CI 可加「provider 列舉與 DB CHECK 一致性」靜態檢查（腳本比對） |
| **假設 Postgres 埠為 5432** | 本地腳本 / 工具連線失敗、時間浪費 | `README` 或 `.env.example` 明註「Supabase local 預設 54322」；可選擇提供 `scripts/check-db-port.sh` |
| **Stub 驗證當作完成** | 產品顯示「通過」但無外部真實檢查 | Code review checklist：**新 provider 必須有真實 HTTP 或明確標註「僅 CLI」並隱藏「驗證金鑰」按鈕** |

### 7.4 下次避免措施（可落地）

1. **流程**：新增 AI provider 的 Definition of Done：**migration 已套用目標 DB + `keys/validate` + `models/test` 至少一條成功路徑 + 單元測試 mock**。
2. **工具**：在 `tools/testing/` 或 `scripts/` 新增「比對 `ai-providers.ts` 與最新 migration 中 provider 字串」的小腳本，接 PR CI。
3. **文件**：於 `tdd-ai-settings-20260221.md` 補一節「新增 provider 檢查清單」（本報告 7.1 表格可摘錄）。

### 7.5 明日優先工作（工時 · 相依 · 風險）

| 優先序 | 項目 | 預估工時 | 相依性 | 風險 |
| :---: | :--- | :---: | :--- | :--- |
| P0 | 非本機環境（staging/prod）套用 `20260417113000` 並驗證寫入 | 0.5–1h | DBA / 部署權限 | 若延遲，正式環境仍無法存 Kilo/OpenCode 金鑰 |
| P1 | 延續 §5：Adapter model preflight、E2E 全測回歸 | 4–6h | 測試帳號、API quota | 外部 rate limit → flaky |
| P2 | `test-manifest.json` 納入 `kilo-opencode-zen` 測試路徑（若採機器編排） | 1h | 測試治理 Phase 1 | 路徑錯誤導致 CI 漏跑 |
| P3 | Paperclip VIS：由 Row **100** 發佈「本日進度摘要」issue（或 CEO dashboard 備註） | 0.5h | `PAPERCLIP_*` 與 superadmin 可 POST `/api/paperclip/issues` | 本機 3187 未啟動時改為手動貼連結 |

### 7.6 任務狀態建議（與 §6 合併視圖）

| 狀態 | 本日相關項目 |
| :--- | :--- |
| **Done** | Kilo/OpenCode HTTP 驗證、`keys/validate` + `models/test` 接線、Jest 6 tests、migration 檔案、baseUrl 對齊、`.env` DATABASE_URL 對齊本機 Supabase |
| **In Review** | 遠端 DB 是否已套用 migration（需環境確認） |
| **In progress** | §5 所列 Adapter preflight / 全測 E2E（與本功能並行） |
| **Todo** | provider 列舉 vs DB CHECK 自動化比對腳本 |
| **Backlog** | 若 Zen API 變更路徑，集中改 `OPENCODE_ZEN_*` 常數並加契約測試 |

### 7.7 Paperclip / 專案協作通知（執行方式）

- **建議**：於 **Project Progress → Row `100` → Task Dispatch / Prompt Engineer**，或呼叫 Superadmin **`POST /api/paperclip/issues`**（需伺服器端 `PAPERCLIP_API_KEY` 等），建立標題如：`[進度] Row100 AI Settings — 2026-04-17 Kilo/OpenCode 驗證上線`。
- **CEO Dashboard**：http://localhost:3187/VIS/agents/ceo/dashboard — 若 Paperclip 容器未啟動，請先依 `docker/paperclip/` 或專案 `start.sh` 啟動後再建立 issue。
- **本自動化執行**：基於環境變數與金鑰不可於日誌中暴露，**未在無設定情境下自動呼叫外部 API**；請於已配置之工作機完成上述一步。

---

## 8) 本日第三階段：Adapter Config 表格 UI（Prompt 下拉修復 + 執行控制精簡）

> **對應 roadmap**：`超級管理員-AI 服務設定（API 金鑰與模型費用）` — **Development Tab 欄 1 編碼：`100`**（`RAW_FEATURES` 陣列第 100 筆）。  
> **DEV-SPEC / TDD-Spec（沿用）**：`/project-process/features/tdd-ai-settings-20260221.md`  
> **TDD Progress Report（本檔）**：`/project-process/test-logs/test-ai-settings-adapter-config-2026-04-17.md`（本章）

### 8.1 本日完成之任務清單（交付物與完成度 %）

| # | 任務 | 交付物（路徑或產出） | 完成度 |
| :-: | :--- | :--- | :---: |
| 1 | **修復 Adapter Config「從 Prompt Management 選擇」下拉失效** | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx`：`textarea` / `select` /「載入」鈕加上 `onMouseDown` + `onPointerDown` 的 `stopPropagation()`；`select` 增加 `relative z-10`、`min-h-8`；`setAdapterConfigDrafts` 改以 `prev[item.id]` 做 functional merge，避免 stale `draft` | **100%** |
| 2 | **移除執行控制列冗餘狀態文案** | 同上檔案：刪除 `runStatusLabel[...]` 之 `<span>`；`CreateAdapterConfigColumnsDeps` 移除 `runStatusLabel` | **100%** |
| 3 | **清理頁面依賴與常數** | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx`：刪除 `ADAPTER_RUN_STATUS_LABEL`；`createAdapterConfigColumns({...})` 不再傳入 `runStatusLabel` | **100%** |
| 4 | **儀表板與日誌同步** | 本檔 §8 + `apps/superadmin/app/data/roadmap.ts` 該列 `devLog` 追加摘要、`percentage` 微調 | **100%** |

### 8.2 遭遇之技術或流程困難（現象 → 排查 → 根因 → 解法）

#### 困難 A：表格內原生 `<select>` 點擊無法正常開啟或選項操作異常

- **問題現象**：使用者於 Adapter Config「測試 Prompt」欄點選「從 Prompt Management 選擇」下拉，體感為「失效」（無法開啟、或一開即關、或選取不穩定）。
- **排查過程**：
  1. 鎖定元件為 `adapter-config-columns.tsx` 內之受控 `<select>`，確認 `onChange` 與 `promptOptions` 載入邏輯正常。
  2. 對照父層 `EnhancedTable`：`adapter-config` 使用 `stretchToContainer={false}`，表格外層為 **`overflow-y-auto overflow-x-scroll`**，儲存格為 **`overflow-hidden`** 之 grid/flex 巢狀結構。
  3. 比對常見瀏覽器行為：原生下拉在可捲動容器內，滑鼠事件冒泡至捲動區或與 sticky/stacking 互動時，易造成選單異常。
- **根因分析**：事件在表格捲動層被干擾／焦點競爭，加上巢狀 overflow 與 z-index 疊層，使原生 `<select>` 的預設行為不穩定（Safari／部分 Chromium 情境尤甚）。
- **最終解決方案**：
  - 在互動元素上 **`mousedown` / `pointerdown` `stopPropagation()`**，阻斷與外層捲動容器的競爭。
  - **`select` 加 `relative z-10`**，降低被鄰欄 sticky 視覺層遮擋的機率。
  - **state 更新一律以 `prev[item.id]` 合併**，避免閉包內過期 `draft` 覆寫其他欄位。

#### 困難 B：執行控制列狀態文字與按鈕語意重複

- **問題現象**：按鈕列右側仍顯示「尚未開始」等文字，與按鈕 `title`／顏色狀態重複，佔寬且干擾閱讀。
- **排查過程**：依使用者 DOM 路徑定位 `runStatusLabel[draft.runStatus]` 之 `<span>`。
- **根因分析**：早期為補足可讀性而加的文字標籤，在圖示化控制列成熟後成為冗餘。
- **最終解決方案**：移除 `<span>` 與對應 `runStatusLabel` 依賴鏈（介面、`page.tsx` 常數）。

### 8.3 本日「踩雷」事件與事前可預防指標

| 踩雷情境 | 導致後果（重工／延遲／資源浪費） | 事前可預防指標 |
| :--- | :--- | :--- |
| **在 `overflow-x-scroll` 的 EnhancedTable 內直接使用原生 `<select>` 但未驗證事件冒泡** | 使用者回報「下拉壞掉」→ 需二次排查 DOM 與捲動層 | 新表格欄位若含 **原生 select/date/file**，PR checklist 必勾「捲動容器內互動元件手動驗證（Chrome + Safari）」 |
| **受控表單用 closure 內 `draft` 做 spread 而非 `prev[id]`** | 快速連點時可能覆寫其他 draft 欄位，難以重現的 heisenbug | Code review：**`setState` 若依賴列 id，一律 functional updater + `prev[id]`** |

### 8.4 下次避免措施（流程／工具／自動化）

1. **流程**：EnhancedTable（或任何 `overflow: scroll` 包表）新增互動欄位時，**預設**為 `select` / `input` 加上 `onPointerDown={(e) => e.stopPropagation()}` 模板，並在 `docs/enhanced-table-guide.md`（或內部 wiki）加一節「表內表單元件」。
2. **工具**：Playwright smoke 一條「Adapter Config 分頁 → 展開表格 → 點 select 可見 option 清單」（不需真後端，可 mock prompts）。
3. **自動化**：在 `tools/testing/` 新增輕量腳本掃描 `createColumnHelper` + `<select` 且無 `stopPropagation` 的組合（僅 heuristics，供 CI warning tier）。

### 8.5 明日優先工作（工時 · 相依性 · 風險）

| 優先序 | 項目 | 預估工時 | 相依性 | 風險 |
| :---: | :--- | :---: | :--- | :--- |
| P0 | 延續 §5／§7.5：Adapter **model preflight** UI（阻擋不可用 model） | 4h | `ai_key_validation_cache` 有資料 | cache 空時需降級文案與「仍允許進階使用者強行」策略 |
| P1 | **E2E**：Adapter Config Prompt 下拉 + 載入 smoke（本日修復迴歸防線） | 2h | E2E 帳號、`#adapter-config` hash | 表格寬 `minWidth` 大，viewport 小時需 `scrollIntoView` |
| P2 | 非本機環境套用 `20260417113000`（若尚未）並驗證 Kilo/OpenCode 寫入 | 0.5–1h | DBA／部署 | 延遲則正式環境無法存新 provider 金鑰 |
| P3 | Paperclip：就 **Row 100** 發佈「§7 + §8 合併進度」議題予 CEO／專責 PM | 0.5h | Superadmin 已登入 + `PAPERCLIP_*` | 無金鑰時改手動貼 §8.6 範本至 VIS |

### 8.6 任務狀態判斷（Backlog / Todo / In progress / In Review / Done）

| 狀態 | 項目 |
| :--- | :--- |
| **Done** | Adapter Config Prompt 下拉事件修復；執行控制列冗餘狀態文字移除；`runStatusLabel` 依賴鏈移除 |
| **In Review** | 多瀏覽器下表內 `select` 長期穩定性（建議 24h 內由 QA 抽測 Safari） |
| **In progress** | §5 Adapter model preflight + blocker UI（與本列功能共用同一頁） |
| **Todo** | 表內表單元件 E2E smoke；`stopPropagation` heuristics 腳本（warning tier） |
| **Backlog** | 若原生 `select` 仍屢出問題，評估改 **Portal 自訂下拉**（設計成本較高） |

### 8.7 Paperclip／CEO Dashboard 通知（本階段執行記錄）

- **CEO Dashboard**（本機已偵測 HTTP 200）：`http://localhost:3187/VIS/agents/ceo/dashboard`
- **建議議題標題**：`[Row100][2026-04-17] AI Settings — Adapter Config UI（Prompt 下拉 + 執行列精簡）`
- **建議議題內文摘要**（可貼至 Paperclip 或 `POST /api/paperclip/issues` 之 `description`）：
  - 完成：§8.1 四項交付物；詳見 `/project-process/test-logs/test-ai-settings-adapter-config-2026-04-17.md` §8。
  - 待 CEO／CTO 關注：§8.5 P0 preflight 與 P1 E2E 排程；§7 遠端 migration 是否已收口。
- **自動送單限制**：`POST /api/paperclip/issues` 需 **Superadmin 登入權限** 與伺服器 **`PAPERCLIP_API_KEY` 等**，本報告不附帶自動呼叫以避免未授權環境誤送；請於已配置工作機由 **Project Progress → Prompt Engineer** 或 API 建立 issue。

---

## 9) 本日第四階段：測試評價自動化（REVIEW 測試ＯＫ → 測試評價）

> **對應 roadmap**：`超級管理員-AI 服務設定（API 金鑰與模型費用）` — **Row ID `100`**。  
> **Development Log Summary**：`/project-process/dev-logs/dev-ai-settings-adapter-config-2026-04-17.md`  
> **本章目的**：將原「人為點選測試 OK」改為「系統規則判定」。

### 9.1 本日完成之任務清單（交付物與完成度）

| # | 任務 | 交付物 | 完成度 |
| :--: | :--- | :--- | :--: |
| 1 | 欄位命名改版：`測試ＯＫ` → `測試評價` | `adapter-config-columns.tsx` | 100% |
| 2 | 新增評價純函式（fail/warning/pending/pass） | `adapter-evaluation.ts` | 100% |
| 3 | 移除手動 toggle 與舊 review 資料流 | `page.tsx` + `adapter-config-columns.tsx` | 100% |
| 4 | 補單元測試（含 pending edge case） | `adapter-evaluation.test.ts`（5 tests） | 100% |

### 9.2 技術困難（現象 → 排查 → 根因 → 最終解法）

#### 困難 A：`effectiveModel` 尚未回傳時被誤判為 fallback
- **問題現象**：`renderedOutput` 已有內容，但評價顯示「模型不正確，暫時回退到 未知模型」。
- **排查過程**：對照 run/poll 更新順序，確認 `effectiveModel` 可能晚於 render 到達。
- **根因分析**：判斷順序缺少資料未就緒分支。
- **最終解法**：新增 `pending` 判斷：`待判定（尚未取得實際模型）`。

#### 困難 B：功能已改自動化，仍保留 legacy `reviewStatus`
- **問題現象**：UI 已無手動 review，但 local/cloud snapshot 仍持久化 `reviewStatus`。
- **排查過程**：全文搜尋 `reviewStatus` 與 storage keys，逐段清點初始化/寫入/回填。
- **根因分析**：改版時未同步收斂資料模型。
- **最終解法**：刪除 `reviewStatus` 相關型別與 snapshot 欄位，避免死資料持續累積。

### 9.3 本日踩雷事件與事前可預防指標

| 踩雷 | 影響 | 可預防指標 |
| :--- | :--- | :--- |
| 先改顯示文案、後補完整狀態機 | 造成一次回修與測試補寫 | 規則型欄位改版需先定義狀態圖（pass/fail/warning/pending）再進 UI |
| 刪除 UI 但未同步刪持久化欄位 | 產生 dead state | PR checklist 強制檢查 `type + storage + hydration` 三層同步 |

### 9.4 下次避免措施（流程 / 工具 / 自動化）

1. **流程**：建立「規則判斷欄位改版模板」，至少包含判斷優先序、資料不足策略、降級文案。  
2. **工具**：新增 snapshot schema 測試，禁止未使用欄位持續寫入 storage。  
3. **自動化腳本需求**：在 CI 加入靜態檢查，若某欄位僅寫不讀（orphaned persisted state）即 warning。

### 9.5 明日優先工作（工時 / 相依 / 風險）

| 優先序 | 項目 | 預估工時 | 相依性 | 風險 |
| :--: | :--- | :--: | :--- | :--- |
| P0 | 可配置化「render 過短門檻」與文案 | 1.5h | PM 對門檻定義 | 門檻設定不當造成誤判率 |
| P1 | E2E 驗證 `測試評價` badge（四種狀態） | 2.5h | 測試帳號與 API 回應穩定 | 外部 provider 波動導致 flaky |
| P2 | 將評價結果匯出至報表欄位 | 2h | 現有 export 流程 | 需避免破壞既有匯出格式相容性 |

---

**文件結尾**：本日工作進度已依 `docs/update-project-progress-guide.md` 寫入 `project-process/test-logs/`（本檔 §9）與 `project-process/dev-logs/`（Development Log Summary 主檔），並更新 `roadmap.ts` 對應列之 `devLogDocPath`。

