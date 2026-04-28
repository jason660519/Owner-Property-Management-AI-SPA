---
name: 'Dispatch Agents'
description: '從 roadmap 挑選待做 feature，透過 superadmin API 建立 Paperclip VIS issue 並指派給對應 agent。觸發方式：/dispatch-agents'
---

# Dispatch Agents Skill

從專案 roadmap（`apps/superadmin/app/data/roadmap.ts`）挑選未完成的 feature，
建立 Paperclip VIS issue 並指派給對應的 AI agent 執行。

## When to Use

- VIS agents 閒置（idle）需要分配新工作
- Sprint 開始，需要批量建立並指派任務
- 使用者說「派工」、「分配任務給 agent」、「找工作給工程師做」

## When NOT to Use

- 只是查看 agent 或 issue 狀態（直接用 API 查詢即可）
- 手動在 VIS UI 建立 issue（不需要此 skill）

---

## Architecture Overview

```
roadmap.ts (feature list)
    ↓ 挑選 feature
superadmin API: GET  /api/roadmap/context/[rowId]    ← Phase 0 新增
    ↓ 回傳 devLog 最後段 + 失敗訊號 + 規格路徑
buildContextAwareDispatchPrompt(snapshot, ideLabel)   ← 產生交接 prompt
    ↓
superadmin API: POST /api/paperclip/issues
    ↓ 自動建 git worktree + 注入 worktree prefix
AgentRuntime (getAgentRuntime())                      ← Phase 0 抽象層
    ↓ 預設 paperclip，AGENT_RUNTIME=local 保留給 Phase 1
Paperclip VIS (localhost:3187)
    ↓ agent heartbeat 自動 pickup
Agent 執行（claude CLI in Docker container）
```

**Phase 0（runtime abstraction）重點**：
- `apps/superadmin/lib/agent-runtime/` 是新的抽象層
- 8 個 `/api/paperclip/*` route 已改成走 `getAgentRuntime()`，
  不再直接 import `lib/paperclip/client`
- 未來替換到 LocalRuntime（Supabase + spawn）只需加一個實作檔

---

## Procedure

### Step 0: Pre-flight Checks

在開始前，確認所有服務正在運行：

```bash
# 1. Paperclip VIS 是否在線？
curl -s "http://localhost:3187/api/health"
# 期望：{"status":"ok", ...}

# 2. Superadmin 是否在線？
curl -s "http://localhost:3001" -o /dev/null -w "%{http_code}"
# 期望：200 或 307

# 3. Docker 容器狀態
docker ps | grep paperclip
```

**如果 Paperclip 沒有運行：**
```bash
cd "<project_root>"
docker compose -f docker/paperclip/docker-compose.paperclip.yml \
  --env-file docker/paperclip/.env.paperclip up -d
# 等 15-20 秒讓服務 ready
```

### Step 1: 查詢 Agent 狀態

```bash
curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "http://localhost:3187/api/companies/$COMPANY_ID/agents"
```

**環境變數來源**：`apps/superadmin/.env.local`

| 變數 | Key 名稱 |
|------|----------|
| API Key | `PAPERCLIP_API_KEY` |
| Company ID | `NEXT_PUBLIC_PAPERCLIP_COMPANY_ID` |
| Project ID | `PAPERCLIP_PROJECT_ID` |

**Agent 角色對照表**（從 `.env.local` 讀取 `NEXT_PUBLIC_PAPERCLIP_AGENT_*`）：

| Role | Env Key | 適合的 Feature 類型 |
|------|---------|-------------------|
| fullstack | `_AGENT_FULLSTACK` | 全端頁面開發、CRUD、整合功能 |
| database | `_AGENT_DATABASE` | DB schema、migration、RLS、索引 |
| sdet / qa | `_AGENT_QA` | 單元測試、E2E、測試覆蓋率 |
| devops | `_AGENT_DEVOPS` | 部署、監控、CI/CD、安全基礎建設 |
| architect | `_AGENT_ARCHITECT` | 架構設計、ADR、重構、技術決策 |
| uiux | `_AGENT_UIUX` | UI 設計、設計系統、暗色模式、RWD |

**CEO / CTO** 不在上面的 role mapping 中，但有自己的 agent ID：
- CEO：管理性任務、Sprint 規劃、review、blocker 處理
- CTO：技術決策、穩定性維護、health check

記錄 idle agents，用於 Step 3 的匹配。

### Step 2: 查詢 Roadmap 待做 Features

從 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列讀取，但正式任務編號必須使用每個 feature 物件的固定 `id` 欄位。
Feature ID = `feature.id`；禁止再用陣列 index + 1 推算。

篩選條件（依需求調整）：
- `percentage < 50`（未完成或剛起步的 feature）
- 避免挑選已有 active VIS issue 的 Feature ID

同時查詢目前 active issues 避免重複：
```bash
curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "http://localhost:3187/api/companies/$COMPANY_ID/issues?status=todo,in_progress,blocked&limit=50"
```

### Step 3: 匹配 Feature → Agent

根據 feature 的 `category`、`name`、`acceptanceCriteria` 關鍵字，
匹配到最適合的 agent role。參考 auto-route 規則：

| 關鍵字 | → Agent |
|--------|---------|
| docker, deploy, 部署, 監控, CI/CD, SSL | DevOps |
| E2E, Playwright, 測試, coverage, QA | QA / SDET |
| 資料庫, migration, schema, RLS, PostgreSQL | Database |
| UI, UX, 設計, RWD, 暗色, 版面, 版型 | UI/UX |
| 架構, 重構, ADR, refactor | Architect |
| 其他（fullstack 功能開發） | Fullstack |

**向使用者確認分配方案後再執行。**

### Step 3.5: 取得 Feature ID 交接 Context（新流程，Phase 0 起）

建 issue 前，先呼叫 superadmin 的 context API 拿到該 row 的完整交接 snapshot：

```bash
curl -s "http://localhost:3001/api/roadmap/context/031"
```

回傳的 `RoadmapContextSnapshot` 包含：
- `latestDevLogSegment`（devLog 最後時間戳段，真正的「當前狀態」）
- `devLogDocContent`（完整日誌 MD 內容）
- `developmentProgress`（當下快照）
- `testLog` / `testLogDocPath`（測試階段交接）
- `featureSpecDocPath` / `tddSpecDocPath`
- `unitFolder` / `e2eFolder`
- `lastRunFailure`（**僅當上次 Paperclip run 失敗時才存在**，含 stderr 尾段）

**這是為什麼不該把 prompt 寫死成 gstack sprint 流程的原因**：每個 row 的起跑
點不同，agent 必須先讀 context 判斷「下一步是什麼」，而不是盲跑 office-hours →
autoplan → ship。

拿到 snapshot 後，呼叫 `buildContextAwareDispatchPrompt(snapshot, ideLabel)`
（在 `apps/superadmin/.../task-dispatch/prompt-templates.ts`）產生可以直接
塞進 issue `description` 的 prompt 字串。

### Step 4: 建立 Issue（⚠️ 最關鍵步驟）

#### ✅ 正確做法：透過 Superadmin API

**Issue #34 PR C 起**：superadmin `/api/paperclip/*` 端點需要認證。shell caller（包含本 skill）必須帶 `Authorization: Bearer $INTERNAL_API_KEY`。用 `tools/paperclip/auth-header.sh` 產生 header（會從 `apps/superadmin/.env.local` 讀 `INTERNAL_API_KEY`）。

```bash
curl -s -X POST "http://localhost:3001/api/paperclip/issues" \
  -H "$(bash tools/paperclip/auth-header.sh)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "[Feature 031] 房東的客戶 Grid模式",
    "description": "**Feature ID**: 031\n**Feature**: ...\n\n## Acceptance Criteria\n1. ...",
    "status": "todo",
    "priority": "medium",
    "assigneeAgentId": "<agent-uuid>"
  }'
```

這個 route 會自動：
1. **建立 git worktree**（`/workspace/.paperclip-worktrees/row-031`）
2. **注入 worktree 指引**到 description 開頭（告訴 agent cd 到哪裡工作）
3. **安裝 git hook**（防止 agent 修改主目錄）
4. **寫入 paperclip_tasks 表**（追蹤任務狀態）
5. **綁定 Paperclip Project**（agent 的 cwd = /workspace）

#### ❌ 錯誤做法：直接打 Paperclip API

```bash
# 不要這樣做！會導致 "Process lost" 錯誤
curl -X POST "http://localhost:3187/api/companies/$COMPANY_ID/issues" ...
```

直接打 Paperclip API 建立的 issue **沒有 worktree**，
agent 的 claude CLI 進程無法正確啟動會立刻退出。

#### 例外：CEO / CTO 的管理性任務

CEO/CTO 的 Sprint 規劃、Review 等**不需要改程式碼**的任務，
可以直接透過 Paperclip API 建立（不需要 worktree）：

```bash
curl -s -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  "http://localhost:3187/api/companies/$COMPANY_ID/issues" \
  -d '{
    "title": "Sprint W16 Review and Coordinate",
    "description": "...",
    "status": "todo",
    "priority": "high",
    "assigneeAgentId": "<ceo-agent-uuid>",
    "projectId": "<project-id>"
  }'
```

### Step 5: 確認 Agent 接手

建立後等待 30-60 秒，agent 的 heartbeat 會自動 pickup todo issues。

```bash
curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "http://localhost:3187/api/companies/$COMPANY_ID/issues?status=todo,in_progress&limit=30"
```

確認新建的 issue 狀態從 `todo` → `in_progress`。

---

## Title 命名規則

Title 格式**必須**包含 `[Feature XXX]`，這樣：
1. `deriveSlugFromTitle()` 才能正確產生 worktree slug（`row-xxx`）
2. Paperclip tasks 表才能正確記錄 `row_id`

```
✅ [Feature 031] 房東的客戶 Grid模式
✅ [Feature 050] 房東財務 銀行帳戶管理 資料庫 schema RLS
❌ 房東的客戶-Grid模式（缺少 Feature ID）
```

**注意**：Title 不要用特殊字元（`－`、`：`），用空格或 ASCII 連字號 `-`。
slug 是從 title 衍生的，特殊字元可能造成 worktree 建立失敗。

---

## Description 模板

```markdown
**Feature ID**: {rowId}
**Feature**: {featureName}
**Located Page**: {locatedPage}
**Category**: {category}
**Points**: {points}

---

## Acceptance Criteria
1. {criteria_1}
2. {criteria_2}
...

## Technical Notes
- {relevant_technical_context}
```

description 會被 superadmin route **自動**在最前面加上 worktree 指引，
不需要手動加。

---

## Adapter 切換注意事項

切換 adapter 時**必須同時更新 `adapterConfig.model`**，否則會報 model_not_found。

| Adapter | 正確的 model 值 |
|---------|----------------|
| `claude_local` | `sonnet`（預設） |
| `codex_local` | `gpt-5.3-codex` |
| `opencode_local` | `google/gemini-2.5-flash` |
| `cursor` | `auto` |

```bash
# 正確切換範例（同時改 adapterType + model）
curl -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  "http://localhost:3187/api/agents/$AGENT_ID" \
  -d '{"adapterType":"codex_local","adapterConfig":{"model":"gpt-5.3-codex"}}'
```

**⚠️ 只改 adapterType 不改 model 會導致持續失敗**（如 codex 收到 `sonnet` → "model does not exist"）。

### 容器內可用的 CLI

| Adapter | CLI 命令 | 安裝方式 |
|---------|---------|---------|
| `claude_local` | `claude` | 預裝（`@anthropic-ai/claude-code`） |
| `codex_local` | `codex` | 預裝（`@openai/codex`） |
| `opencode_local` | `opencode` | 預裝（`opencode-ai`） |
| `cursor` | `agent` | `curl https://cursor.com/install -fsSL \| bash` + `ln -sf $HOME/.local/bin/agent /usr/local/bin/agent` |

### 必要環境變數（docker-compose.paperclip.yml）

| Adapter | 環境變數 |
|---------|---------|
| `claude_local` | `CLAUDE_CODE_OAUTH_TOKEN` |
| `codex_local` | `OPENAI_API_KEY` |
| `opencode_local` | `GOOGLE_GENERATIVE_AI_API_KEY`（不是 `GEMINI_API_KEY`） |
| `cursor` | `CURSOR_API_KEY` |

---

## Troubleshooting

### Agent 顯示 "The requested model 'sonnet' does not exist" (codex_local)

**原因**：切換 adapter 時只改了 `adapterType`，沒改 `adapterConfig.model`。
**修復**：PATCH agent 同時設定正確的 model（見上方對照表）。

### Agent 顯示 "Process lost -- child pid X is no longer running"

**原因**：Issue 沒有 worktree（直接用 Paperclip API 建立的）。
**修復**：取消該 issue，透過 superadmin API 重新建立。

```bash
# 取消
curl -s -X POST "http://localhost:3001/api/paperclip/issues/{issueId}/update" \
  -H "$(bash tools/paperclip/auth-header.sh)" \
  -H "Content-Type: application/json" -d '{"status":"cancelled"}'

# 重新建立（透過 superadmin）— 每一支 localhost:3001/api/paperclip/* 呼叫都要加
# -H "$(bash tools/paperclip/auth-header.sh)"
curl -s -X POST "http://localhost:3001/api/paperclip/issues" \
  -H "$(bash tools/paperclip/auth-header.sh)" \
  -H "Content-Type: application/json" -d '{ ... }'
```

### Paperclip 容器 crash（exit code 137 = OOM）

```bash
docker compose -f docker/paperclip/docker-compose.paperclip.yml \
  --env-file docker/paperclip/.env.paperclip up -d
# 等 15-20 秒
```

容器 data 是持久化的（`$PAPERCLIP_DATA_DIR`），重啟不會丟失 issues。

### Worktree 建立失敗（slug 衝突）

如果同一個 Feature ID 已經有 worktree，會報錯。
先清理舊的 worktree：

```bash
curl -s -X POST "http://localhost:3001/api/paperclip/worktrees/cleanup" \
  -H "$(bash tools/paperclip/auth-header.sh)" \
  -H "Content-Type: application/json"
```

### 查詢現有 worktrees

```bash
curl -s "http://localhost:3001/api/paperclip/worktrees" \
  -H "$(bash tools/paperclip/auth-header.sh)"
```

---

## Auto-Dispatch（自動派工）

除了手動 `/dispatch-agents`，也可以用自動派工 API：

```bash
# Dry-run：只看計畫不執行
curl -s -X POST "http://localhost:3001/api/paperclip/auto-dispatch?dryRun=true&limit=5" \
  -H "$(bash tools/paperclip/auth-header.sh)"

# 實際執行：最多派 2 個任務
curl -s -X POST "http://localhost:3001/api/paperclip/auto-dispatch?limit=2" \
  -H "$(bash tools/paperclip/auth-header.sh)"
```

Auto-dispatch 已設定 cron 每 10 分鐘執行（上限 2 個任務）。

## 相關 Skills

| Skill | 用途 |
|-------|------|
| `/dispatch-agents` | 手動派工（本 skill） |
| `/review-agent-work` | 檢查 agent 產出 → 修復 → merge → 更新 roadmap |

## Quick Reference: API Endpoints

| 用途 | Method | Endpoint |
|------|--------|----------|
| 建立 issue（含 worktree）| POST | `localhost:3001/api/paperclip/issues` |
| 更新 issue 狀態 | POST | `localhost:3001/api/paperclip/issues/{id}/update` |
| 查詢 issue 狀態 | GET | `localhost:3001/api/paperclip/issues/{id}/status` |
| 查詢 agents | GET | `localhost:3187/api/companies/{companyId}/agents` |
| 查詢 issues | GET | `localhost:3187/api/companies/{companyId}/issues` |
| 查詢 worktrees | GET | `localhost:3001/api/paperclip/worktrees` |
| 清理 worktrees | POST | `localhost:3001/api/paperclip/worktrees/cleanup` |
| 健康檢查 | GET | `localhost:3187/api/health` |
| 工作摘要 | GET | `localhost:3001/api/paperclip/work-summary` |
| Agent 健康 | GET | `localhost:3001/api/paperclip/agent-health` |
| 自動派工 | POST | `localhost:3001/api/paperclip/auto-dispatch?limit=N` |
| Merge branch | POST | `localhost:3001/api/paperclip/worktrees/{slug}/merge` |
