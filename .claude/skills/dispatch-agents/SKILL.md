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
superadmin API: POST /api/paperclip/issues
    ↓ 自動建立 git worktree + 注入 description prefix
Paperclip VIS (localhost:3187)
    ↓ agent heartbeat 自動 pickup
Agent 執行（claude CLI in Docker container）
```

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

從 `apps/superadmin/app/data/roadmap.ts` 的 `RAW_FEATURES` 陣列讀取。
Row ID = 陣列 index + 1（1-based）。

篩選條件（依需求調整）：
- `percentage < 50`（未完成或剛起步的 feature）
- 避免挑選已有 active VIS issue 的 Row

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

### Step 4: 建立 Issue（⚠️ 最關鍵步驟）

#### ✅ 正確做法：透過 Superadmin API

```bash
curl -s -X POST "http://localhost:3001/api/paperclip/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "[Row 031] 房東的客戶 Grid模式",
    "description": "**Row ID**: 031\n**Feature**: ...\n\n## Acceptance Criteria\n1. ...",
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

Title 格式**必須**包含 `[Row XXX]`，這樣：
1. `deriveSlugFromTitle()` 才能正確產生 worktree slug（`row-xxx`）
2. Paperclip tasks 表才能正確記錄 `row_id`

```
✅ [Row 031] 房東的客戶 Grid模式
✅ [Row 050] 房東財務 銀行帳戶管理 資料庫 schema RLS
❌ 房東的客戶-Grid模式（缺少 Row ID）
```

**注意**：Title 不要用特殊字元（`－`、`：`），用空格或 ASCII 連字號 `-`。
slug 是從 title 衍生的，特殊字元可能造成 worktree 建立失敗。

---

## Description 模板

```markdown
**Row ID**: {rowId}
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

## Troubleshooting

### Agent 顯示 "Process lost -- child pid X is no longer running"

**原因**：Issue 沒有 worktree（直接用 Paperclip API 建立的）。
**修復**：取消該 issue，透過 superadmin API 重新建立。

```bash
# 取消
curl -s -X POST "http://localhost:3001/api/paperclip/issues/{issueId}/update" \
  -H "Content-Type: application/json" -d '{"status":"cancelled"}'

# 重新建立（透過 superadmin）
curl -s -X POST "http://localhost:3001/api/paperclip/issues" ...
```

### Paperclip 容器 crash（exit code 137 = OOM）

```bash
docker compose -f docker/paperclip/docker-compose.paperclip.yml \
  --env-file docker/paperclip/.env.paperclip up -d
# 等 15-20 秒
```

容器 data 是持久化的（`$PAPERCLIP_DATA_DIR`），重啟不會丟失 issues。

### Worktree 建立失敗（slug 衝突）

如果同一個 Row ID 已經有 worktree，會報錯。
先清理舊的 worktree：

```bash
curl -s -X POST "http://localhost:3001/api/paperclip/worktrees/cleanup" \
  -H "Content-Type: application/json"
```

### 查詢現有 worktrees

```bash
curl -s "http://localhost:3001/api/paperclip/worktrees"
```

---

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
