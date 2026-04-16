# Agent Production 上線檢查清單

> **建立日期**: 2026-04-16 | **位置**: `docs/operational-guides/agent-production-checklist.md`
> **適用對象**: 所有要將 AI Agent 功能推上 production 的開發者
> **目的**: 確保多用戶 agent 上線前已鎖定七個關鍵風險點，避免 API 費用爆炸、資料外洩、幽靈錯誤等問題

---

## 為什麼需要這份清單

單用戶 agent（自己用）和多用戶 agent（上 production）是兩件完全不同的事。
常見的災難案例：

- API key 外洩 → 帳單爆炸
- Runaway loop → 一夜燒掉 $10K
- 某天 200 個用戶同時收到幻覺回應，沒人發現
- 模型被 deprecated，服務直接掛掉

以下七個檢查點，缺一不可。

---

## Checklist

### ✅ 1. Model Control（模型控制層）

**目標**：在程式碼和模型之間建立統一抽象層，不 hard code 任何模型名稱。

本專案現況對照：

| 項目 | 本專案做法 |
|:-----|:----------|
| 多 provider 支援 | Paperclip adapter 系統：`claude_local` / `codex_local` / `opencode_local` / `cursor` |
| 模型名稱集中管理 | `adapterConfig.model` 統一設定，切換 adapter 時**必須同時更新** |
| API key 集中 | `.env` 管理，不散落在程式碼中 |
| 快速換模型 | 透過 `POST /api/paperclip/issues` 的 adapter 欄位切換，不改程式碼 |

**上線前確認**：
- [ ] 沒有任何地方 hard code 模型名稱（如 `"claude-3-5-haiku-20241022"`）
- [ ] `.env.example` 有列出所有需要的 API key
- [ ] 切換 adapter 時 `adapterConfig.model` 已同步更新（見 AGENTS.md adapter 對照表）
- [ ] 有備用 adapter 方案，當主要 provider 掛掉時能快速切換

---

### ✅ 2. Prompt Registry（提示詞版本管理）

**目標**：Prompt 是 IP，要版本控制，不能埋在程式碼裡。

本專案現況對照：

| 項目 | 本專案做法 |
|:-----|:----------|
| Prompt 集中存放 | `docs/prompts/` 目錄 |
| Agent 指令文件 | `.claude/rules/`、`CLAUDE.md`、`AGENTS.md` |
| 版本追蹤 | Git history |
| 測試不同 prompt | 本地跑 agent 對比輸出 |

**上線前確認**：
- [ ] System prompt 不是直接寫死在 API call 裡，而是從設定檔或 registry 讀取
- [ ] Prompt 變更有走 PR review，不是直接 push
- [ ] 有記錄「這個 prompt 是為了解決什麼問題」的 context
- [ ] 不同 agent role 的 prompt 有分開管理（不要全部塞在一個大 string）

---

### ✅ 3. Guardrails（輸入輸出護欄）

**目標**：在 agent 對任何用戶說話之前，先保護輸入和輸出。

四個 hook 點：

```
用戶輸入 → [Pre-LLM] → LLM → [Post-LLM] → 工具呼叫 → [Pre-Tool] → 工具 → [Post-Tool] → 用戶
```

本專案需要特別注意：

| 風險 | 本專案場景 | 對策 |
|:-----|:----------|:-----|
| PII 外洩 | 房東/租客個人資料、身分證字號、銀行帳號 | 輸出前過濾或遮罩 |
| Prompt injection | 用戶在表單欄位塞惡意指令 | Pre-LLM 清洗輸入 |
| 競品提及 | Agent 回應中提到競爭對手平台 | Post-LLM 過濾 |
| 不當內容 | 租屋糾紛場景可能觸發敏感話題 | 內容分類 + 拒絕回應 |
| Storage 存取 | `property-documents` bucket 是 private | 一律用 signed URL，不直接暴露路徑 |

**上線前確認**：
- [ ] 用戶輸入有做基本清洗（長度限制、特殊字元）
- [ ] 輸出不包含 service_role key 或任何內部 API key
- [ ] 個人資料（姓名、電話、身分證）在 log 中有遮罩
- [ ] Mobile app 端沒有內嵌 `service_role`（見 AGENTS.md）
- [ ] RLS 有正確設定，agent 不能跨用戶讀取資料

---

### ✅ 4. Budget Limiting（預算上限）

**目標**：一個 runaway loop 不能讓你破產。

本專案現況對照：

| 項目 | 本專案做法 |
|:-----|:----------|
| 每日預算上限 | 透過各 provider dashboard 設定（Anthropic / OpenAI / Google） |
| 多 agent 並行 | Paperclip worktree 系統，多個 agent 同時跑 |
| 費用監控 | `GET /api/paperclip/agent-health` 偵測異常 |
| Token 節省 | 見 `docs/operational-guides/token-saving-guide.md` |

**上線前確認**：
- [ ] 每個 provider 帳號都有設定每日/每月費用警報
- [ ] Paperclip agent 有設定 timeout，不會無限跑
- [ ] 有監控機制能偵測單一 agent 異常高消耗
- [ ] 開發/測試環境用便宜模型（如 `gemini-2.5-flash`），不要用 production 模型跑測試
- [ ] `test-manifest.json` 的 nightly 測試有合理的 token 預算估算

---

### ✅ 5. Tool & MCP 管理

**目標**：每個工具都有認證、有測試、有權限控制。

本專案 MCP 清單（`.mcp.json`）：

| MCP Server | 用途 | 風險等級 |
|:-----------|:-----|:---------|
| Supabase MCP | 直接操作 DB | 🔴 高 |
| Playwright MCP | 瀏覽器自動化 | 🟡 中 |
| Gmail / Calendar | 外部服務 | 🟡 中 |
| Context7 | 查文件（唯讀） | 🟢 低 |
| Filesystem | 讀寫本地檔案 | 🔴 高 |

**上線前確認**：
- [ ] 每個 MCP server 的 API key 都在 `.env` 中，不在程式碼裡
- [ ] Supabase MCP 用的是 `anon` key（有 RLS），不是 `service_role`（除非明確需要）
- [ ] `createAdminClient` 只在 superadmin 後台使用，不暴露給一般用戶
- [ ] 每個 tool 有對應的測試（見 `test-manifest.json`）
- [ ] Playwright CLI 優先於 Playwright MCP（省 token，見 token-saving-guide）
- [ ] MCP 工具的錯誤有被 catch，不會讓 agent 卡死

---

### ✅ 6. Monitoring & Tracing（監控與追蹤）

**目標**：用戶回報問題時，你能在 5 分鐘內找到根因。

本專案現有監控：

| 工具 | 用途 | 位置 |
|:-----|:-----|:-----|
| Elasticsearch + Kibana | Log 搜尋與視覺化 | `localhost:9200` / `localhost:5601` |
| Elastic Observability | APM traces | 見 `docs/operational-guides/elastic-observability-mvp.md` |
| Kibana 告警 | 異常閾值通知 | 見 `docs/operational-guides/elastic-alert-thresholds.md` |
| Paperclip work-summary | Agent 完成狀態掃描 | `GET /api/paperclip/work-summary` |
| Agent health | Adapter 失敗偵測 | `GET /api/paperclip/agent-health` |

**每個 agent 呼叫應記錄**：

```
- timestamp
- user_id（匿名化）
- agent_type / adapter
- input token count
- output token count
- latency (ms)
- tool calls（名稱 + 結果）
- error（如有）
- trace_id（串接整個對話鏈）
```

**上線前確認**：
- [ ] Elasticsearch 有跑起來（`./start.sh elastic`）
- [ ] 每個 agent 呼叫都有 `trace_id` 可以追蹤完整鏈路
- [ ] Error 有分級：`warn`（可繼續）vs `error`（需人工介入）
- [ ] Kibana dashboard 有設定 agent 相關的 panel
- [ ] 告警閾值已設定（見 `elastic-alert-thresholds.md`）
- [ ] Log 中的個人資料有遮罩（不能把用戶輸入原文存進 log）

---

### ✅ 7. Evals（評估）

**目標**：在用戶發現問題之前，你先發現。

兩種 eval 時機：

```
上線前 Evals                    上線後 Evals
─────────────────               ─────────────────────────────
• 功能是否符合預期？             • 換新模型前：用歷史 trace 跑回歸
• Structured output 格式正確？   • 效能退化偵測：某類查詢成功率下降
• Edge case 有沒有爆？           • Prompt 更新後：A/B 對比舊版
• 每個 tool 獨立測試通過？       • 定期 nightly regression
```

本專案 eval 架構：

| 層級 | 位置 | 說明 |
|:-----|:-----|:-----|
| Unit test | `apps/superadmin/unit_test/{ID}/` | 單一功能測試 |
| E2E（功能專屬） | `apps/superadmin/e2e/{ID}/` | 特定 feature 的端對端 |
| E2E（共用） | `apps/superadmin/e2e/common/smoke/` | 快速冒煙測試 |
| E2E（共用） | `apps/superadmin/e2e/common/regression/` | 完整回歸測試 |
| Nightly | `test-manifest.json`（`tier=nightly`） | 排程自動跑，需填 `nightlyLayer` + `nightlyOrder` |

**上線前確認**：
- [ ] 核心 agent 流程有 E2E 測試覆蓋
- [ ] `test-manifest.json` 已更新，nightly 條目有填 `nightlyLayer` 和 `nightlyOrder`
- [ ] 執行過 `tools/testing/validate-test-manifest.sh`
- [ ] 有至少一組「已知好的輸出」作為 baseline，用來偵測退化
- [ ] 換模型前必須跑完 regression suite 才能上線

---

## 快速自查表

上線前跑一遍，全部打勾才能 deploy：

```
Model Control
  □ 沒有 hard code 模型名稱
  □ API key 在 .env，不在程式碼
  □ 有備用 adapter

Prompt Registry
  □ Prompt 從設定檔讀取，不寫死
  □ Prompt 變更走 PR review

Guardrails
  □ 輸入有清洗
  □ 輸出不含 key 或 PII
  □ RLS 正確設定

Budget Limiting
  □ Provider 帳號有費用警報
  □ Agent 有 timeout 設定

Tool & MCP
  □ 所有 MCP key 在 .env
  □ Supabase 用 anon key（除非需要 admin）
  □ 每個 tool 有測試

Monitoring
  □ Elasticsearch 有跑
  □ 每個呼叫有 trace_id
  □ Log 有遮罩 PII

Evals
  □ 核心流程有 E2E 覆蓋
  □ test-manifest.json 已更新
  □ validate-test-manifest.sh 通過
```

---

## 相關文件

| 文件 | 說明 |
|:-----|:-----|
| `docs/operational-guides/token-saving-guide.md` | 降低 token 消耗的具體技巧 |
| `docs/operational-guides/elastic-observability-mvp.md` | Elasticsearch 監控設定 |
| `docs/operational-guides/elastic-alert-thresholds.md` | Kibana 告警閾值 |
| `docs/operational-guides/authentication-sop.md` | 認證 SOP |
| `AGENTS.md` | Adapter / model 對照表、已知陷阱 |
| `.claude/skills/dispatch-agents/SKILL.md` | Paperclip agent 派工完整流程 |
