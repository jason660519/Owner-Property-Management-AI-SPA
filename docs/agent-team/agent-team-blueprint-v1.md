# Agent Team 完整架構藍圖 v1

> **文件用途**：技術設計參考，供排期後的實作團隊使用。  
> **配合閱讀**：[agent-team-strategy-one-pager.md](./agent-team-strategy-one-pager.md)（決策版）  
> **最後更新**：2026/04/22  
> **版本**：v1.1（納入套件化與獨立抽離策略）  
> **狀態**：待決策，尚未進入實作

---

## 目錄

1. [系統定位與演進路徑](#1-系統定位與演進路徑)
2. [六層架構設計](#2-六層架構設計)
3. [角色定義與責任邊界](#3-角色定義與責任邊界)
4. [角色間訊息契約](#4-角色間訊息契約)
5. [Issue Lifecycle 狀態機](#5-issue-lifecycle-狀態機)
6. [事件日誌設計](#6-事件日誌設計)
7. [記憶體系設計（Memory Architecture）](#7-記憶體系設計memory-architecture)
8. [LocalRuntime 實作規格](#8-localruntime-實作規格)
9. [雙軌遷移計畫](#9-雙軌遷移計畫)
10. [風險登記與對策](#10-風險登記與對策)
11. [驗收 KPI 與門檻](#11-驗收-kpi-與門檻)
12. [第一批 2 週 Sprint 執行清單](#12-第一批-2-週-sprint-執行清單)
13. [Issue Tracker 任務卡模板（S1-S8）](#13-issue-tracker-任務卡模板s1-s8)

---

## 1. 系統定位與演進路徑

### 1.1 不是替換，是進化

```
Phase 0（現行）        Phase 1（MVP）           Phase 2（V1）
───────────────        ──────────────────        ───────────────────────
PaperclipRuntime  →    PaperclipRuntime +         LocalRuntime（主）
（唯一 runtime）        LocalRuntime（試點）        PaperclipRuntime（後備）
                        feature flag 切換          事件驅動 + 跨角色記憶
```

**Strangler Pattern（絞殺者模式）**：新流量透過 feature flag 逐漸導入 LocalRuntime，現有 Paperclip worktree 繼續服務既有 Row，直到 LocalRuntime 穩定後再執行排水遷移。

### 1.2 產品化策略：先孵化、後抽離

本方案採用「**Monorepo 孵化 → 獨立專案抽離**」兩階段：

1. **孵化階段（MVP–V1 前半）**：先在 `packages/agent-team` 開發並由 `apps/superadmin` 以 workspace 依賴消費
2. **抽離階段（V1 後半）**：介面穩定後，抽到獨立 repo（例如 `agent-team-runtime`）並透過版本發布供多專案安裝

理由：
- 以真實業務任務驗證抽象邊界，避免過早通用化
- 維持改動速度（同 repo 直接聯調）
- 將「可重用」作為結果，而非前置假設

### 1.3 現有基礎盤點

| 現有資產 | 檔案路徑 | Phase 中的角色 |
|---|---|---|
| AgentRuntime 介面 | `apps/superadmin/lib/agent-runtime/interface.ts` | LocalRuntime 需實作的 5 個方法 |
| Runtime 工廠 | `apps/superadmin/lib/agent-runtime/factory.ts` | feature flag 切換入口 |
| PaperclipRuntime | `apps/superadmin/lib/agent-runtime/paperclip-runtime.ts` | Phase 1 並行後備 |
| Adapter 設定 | `apps/superadmin/lib/adapter-config.ts` | 角色路由基礎 |
| 事件表 | `supabase/migrations/20260414100000_paperclip_ops_integration.sql` | 可擴充為 agent_team_events |
| Hermes 記憶介面 | `hermes-agent/agent/memory_provider.py` | V1 記憶整合參考 |
| 派工 Skill | `.claude/skills/dispatch-agents/SKILL.md` | MVP 運營模板（沿用） |

### 1.4 建議模組位置（孵化期）

```
packages/
  agent-team/
    src/
      runtime/
      roles/
      memory/
      events/
      governance/
    package.json
    tsconfig.json
```

`apps/superadmin` 在孵化期只保留整合層程式碼（環境變數、UI 與資料來源橋接），核心邏輯優先收斂在 `packages/agent-team`。

---

## 2. 六層架構設計

```
┌─────────────────────────────────────────────────────────┐
│  6. Governance Layer                                     │
│     成本治理 / Token Budget / 角色衝突仲裁               │
├─────────────────────────────────────────────────────────┤
│  5. Event Log Layer                                      │
│     agent_team_events（Supabase）/ Realtime 訂閱        │
├─────────────────────────────────────────────────────────┤
│  4. Memory Layer                                         │
│     Task Memory（MVP）→ Lesson Memory（V1）             │
├─────────────────────────────────────────────────────────┤
│  3. Role Layer                                           │
│     8 個角色定義 / 系統提示 / 責任邊界                  │
├─────────────────────────────────────────────────────────┤
│  2. Adapter Layer                                        │
│     現有 adapter-config.ts 擴充角色路由欄位             │
├─────────────────────────────────────────────────────────┤
│  1. Runtime Layer                                        │
│     LocalRuntime（新）/ PaperclipRuntime（後備）         │
└─────────────────────────────────────────────────────────┘
```

### 層間依賴規則

- 上層依賴下層介面，不依賴實作
- Event Log 是唯一跨層的資料通道（其他層不可直接互呼）
- Memory 只能被 Role Layer 讀寫，Governance Layer 只能讀

---

## 3. 角色定義與責任邊界

### 3.1 MVP 啟用角色（4 個）

| 角色 | 英文代號 | 主要職責 | 觸發條件 |
|---|---|---|---|
| **架構師** | `architect` | 拆解需求、產出技術規格、定義介面邊界 | 新 Row 進入 `planning` 狀態 |
| **全端工程師** | `fullstack` | 依規格實作功能（前端 + 後端）、提交 PR | 規格進入 `designing` 狀態 |
| **QA 工程師** | `qa` | 撰寫與執行測試、回報失敗、驗收 PR | 功能進入 `testing` 狀態 |
| **DevOps 工程師** | `devops` | 部署、Migration 執行、監控設定 | PR 進入 `review` 狀態 |

### 3.2 V1 新增角色（4 個）

| 角色 | 英文代號 | 主要職責 | 觸發條件 |
|---|---|---|---|
| **執行長** | `ceo` | 任務優先順序決策、資源分配、仲裁升級 | 角色衝突無法自動解決時 |
| **技術長** | `cto` | 技術方向審核、重大架構決策、技術債治理 | 架構師規格超出既有邊界時 |
| **資料庫工程師** | `database` | Schema 設計、Migration 審核、查詢最佳化 | Architect 提出 DB 變更時 |
| **UI/UX 設計師** | `uiux` | 介面規格、設計 Token 一致性、使用者流程 | 前端功能需要視覺設計時 |

### 3.3 角色系統提示存放位置

```
.claude/rules/agent-roles/
  architect.md
  fullstack.md
  qa.md
  devops.md
  ceo.md        ← V1
  cto.md        ← V1
  database.md   ← V1
  uiux.md       ← V1
```

每個提示檔包含：角色定位、輸入格式要求、輸出格式要求、禁止行為、升級條件。

---

## 4. 角色間訊息契約

### 4.1 TypeScript 介面定義

```typescript
// apps/superadmin/lib/agent-runtime/agent-message.ts

export type AgentRole = 
  | 'architect' 
  | 'fullstack' 
  | 'qa' 
  | 'devops'
  | 'ceo'       // V1
  | 'cto'       // V1
  | 'database'  // V1
  | 'uiux';     // V1

export type MessageIntent =
  | 'request'           // 請求另一角色執行工作
  | 'deliver'           // 交付工作成果
  | 'clarify'           // 要求澄清規格
  | 'reject'            // 拒絕並說明原因
  | 'escalate'          // 升級至 CEO/CTO
  | 'acknowledge';      // 確認收到

export type MessageStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'escalated';

export interface AgentMessage {
  id: string;                        // UUID
  issue_id: string;                  // Paperclip / LocalRuntime issue ID
  from_role: AgentRole;
  to_role: AgentRole;
  intent: MessageIntent;
  payload: {
    description: string;             // 工作說明（純文字）
    artifacts?: string[];            // 產出物參照（檔案路徑或 URL）
    context_ref?: string;            // Memory key 參照（不直接嵌入 memory 內容）
  };
  expected_output: string;           // 預期輸出的格式與標準
  status: MessageStatus;
  deadline_minutes?: number;         // 預期完成時間（分鐘），null = 無期限
  version: number;                   // 樂觀鎖，每次更新 +1
  created_at: string;                // ISO 8601
  updated_at: string;
}
```

### 4.2 訊息流向規則

```
Architect ──request──► Fullstack
Architect ──request──► Database    ← V1
Fullstack ──deliver──► QA
QA ────────reject──►  Fullstack
QA ────────deliver──► DevOps
DevOps ────deliver──► [merge complete]
任意角色 ──escalate──► CTO / CEO   ← V1
```

**禁止**：
- Fullstack 直接向 DevOps 要求部署（必須先過 QA）
- 任何角色直接修改另一角色的 Memory
- CEO 直接執行功能程式碼

---

## 5. Issue Lifecycle 狀態機

```
                ┌──────────────────────────────────────────┐
                │               Issue 狀態機                │
                └──────────────────────────────────────────┘

  [queued]
     │
     ▼  architect 開始分析
  [planning]
     │
     ▼  architect 產出技術規格
  [designing]
     │
     ├──── (DB 變更) ──► architect ──request──► database ──deliver──► architect
     │
     ▼  fullstack 開始實作
  [implementing]
     │
     ▼  fullstack 提交 PR
  [testing]
     │
     ├──── (測試失敗) ──► qa ──reject──► fullstack ──► 回到 [implementing]
     │
     ▼  QA 通過
  [review]
     │
     ▼  devops 部署確認
  [merged]
     │
     ▼  task memory 寫入 → lesson 萃取 (V1)
  [closed]

  任一狀態 ──► [failed]（含 retry 計數與 fallback 觸發條件）
```

### 狀態轉換規則

| 轉換 | 觸發方 | 需要前置條件 |
|---|---|---|
| `queued` → `planning` | LocalRuntime / 派工 API | 任務說明完整（非空白） |
| `planning` → `designing` | `architect` 角色 | 產出規格文件（artifact 非空） |
| `designing` → `implementing` | `fullstack` 角色 | 規格中有明確的 API/UI 邊界定義 |
| `implementing` → `testing` | `fullstack` 角色 | PR 建立成功 |
| `testing` → `implementing` | `qa` 角色 | 測試失敗報告 + 失敗項目清單 |
| `testing` → `review` | `qa` 角色 | 測試通過率 ≥ 門檻（預設 90%） |
| `review` → `merged` | `devops` 角色 | Migration 執行確認 + 無部署警告 |
| 任一狀態 → `failed` | Runtime | 重試 3 次後仍失敗 / timeout |
| `failed` → `queued` | Runtime / 人工 | 手動觸發 retry 或 fallback |

---

## 6. 事件日誌設計

### 6.1 Supabase 資料表：`agent_team_events`

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_agent_team_events.sql

CREATE TABLE agent_team_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      TEXT NOT NULL,
  from_role     TEXT,                        -- NULL = system
  to_role       TEXT,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  status_before TEXT,
  status_after  TEXT,
  runtime       TEXT NOT NULL DEFAULT 'local',  -- 'local' | 'paperclip'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_team_events_issue_id ON agent_team_events(issue_id);
CREATE INDEX idx_agent_team_events_created_at ON agent_team_events(created_at DESC);
```

### 6.2 事件類型清單

| event_type | 說明 | 觸發方 |
|---|---|---|
| `issue.queued` | 任務進入佇列 | Runtime |
| `issue.planning_started` | 架構師開始規劃 | architect |
| `issue.spec_delivered` | 規格文件完成 | architect |
| `issue.implementation_started` | 全端工程師開始實作 | fullstack |
| `issue.pr_created` | PR 建立 | fullstack |
| `issue.test_started` | QA 開始測試 | qa |
| `issue.test_failed` | 測試失敗 | qa |
| `issue.test_passed` | 測試通過 | qa |
| `issue.review_started` | DevOps 開始 review | devops |
| `issue.merged` | PR merge 完成 | devops |
| `issue.failed` | 任務失敗 | Runtime |
| `issue.fallback_triggered` | 降回 Paperclip Runtime | Runtime |
| `message.sent` | 角色間訊息傳送 | 任一角色 |
| `message.rejected` | 訊息被拒絕 | 任一角色 |
| `message.escalated` | 升級至 CEO/CTO | 任一角色 |
| `memory.written` | Task memory 寫入 | Runtime |
| `lesson.extracted` | Lesson 萃取完成（V1） | Runtime |

### 6.3 Realtime 訂閱（MVP 建議）

```typescript
// 前端 VIS 儀表板訂閱範例
supabase
  .channel('agent_team_events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_team_events',
  }, (payload) => {
    // 更新 UI 狀態
  })
  .subscribe();
```

---

## 7. 記憶體系設計（Memory Architecture）

### 7.1 兩層記憶（MVP vs V1）

```
┌─────────────────────────────────────────────────────────┐
│  V1: Lesson Memory（跨任務）                             │
│  • 儲存：Supabase agent_lessons 表                       │
│  • 寫入時機：issue closed 後，Runtime 自動萃取           │
│  • 讀取時機：同類 issue 開始 planning 時                 │
├─────────────────────────────────────────────────────────┤
│  MVP: Task Memory（單任務）                              │
│  • 儲存：agent_team_events.payload 中的 context 欄位     │
│  • 寫入時機：每個狀態轉換時                              │
│  • 讀取時機：角色收到訊息時                              │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Task Memory 結構（MVP）

```typescript
interface TaskMemory {
  issue_id: string;
  role: AgentRole;
  phase: string;               // 狀態機當前狀態
  key_decisions: string[];     // 重要決策摘要（最多 5 條）
  touched_files: string[];     // 本次修改的檔案
  errors_encountered: string[]; // 遇到的錯誤（最多 3 條）
  handoff_note: string;        // 交接給下一角色的說明
}
```

### 7.3 Lesson Memory 結構（V1）

```typescript
interface LessonMemory {
  id: string;
  category: string;         // e.g. 'migration', 'typescript-strict', 'react19-compat'
  trigger_pattern: string;  // 觸發此 lesson 的條件（關鍵字或模式）
  lesson: string;           // 學到的教訓（≤ 200 字）
  source_issue_ids: string[]; // 來源 issue 清單
  confidence: number;       // 0–1，基於出現頻率
  created_at: string;
  last_reinforced_at: string;
}
```

### 7.4 記憶污染防護

- Task Memory 只在單一 issue 生命週期內有效，issue closed 後自動歸檔
- Lesson 萃取需要人工審核 flag（V1 初期），通過後才寫入 Lesson Memory
- 禁止角色直接將外部輸入（使用者輸入、第三方 API 回應）原文寫入 Memory，必須先摘要化

---

## 8. LocalRuntime 實作規格

### 8.1 需實作的 AgentRuntime 介面方法

```typescript
// 建議放在 packages/agent-team/src/runtime/interface.ts
// LocalRuntime 必須完整實作以下 5 個方法：

interface AgentRuntime {
  createIssue(params: CreateIssueParams): Promise<CreateIssueResult>;
  updateIssue(params: UpdateIssueParams): Promise<void>;
  fetchIssueStatus(issueId: string): Promise<IssueStatus>;
  fetchIssueCost(issueId: string): Promise<IssueCost>;
  fetchIssueRunLog(issueId: string): Promise<IssueRunLog>;
}
```

### 8.2 LocalRuntime 額外職責（介面外）

以下職責由 LocalRuntime 內部處理，不外露到 AgentRuntime 介面：

| 職責 | 說明 | MVP / V1 |
|---|---|---|
| 角色派工 | 依狀態機決定呼叫哪個角色的 Adapter | MVP |
| 事件寫入 | 每次狀態轉換寫入 `agent_team_events` | MVP |
| Task Memory 寫入 | 狀態轉換時更新 TaskMemory | MVP |
| 重試邏輯 | 失敗後重試最多 3 次，第 4 次觸發 fallback | MVP |
| Fallback 觸發 | 呼叫 PaperclipRuntime 接手 | MVP |
| Lesson 萃取 | issue closed 後觸發 lesson pipeline | V1 |
| Token Budget 檢查 | 每個角色呼叫前檢查 budget 剩餘 | V1 |

### 8.3 套件對外 API（孵化期）

```typescript
// packages/agent-team/src/index.ts

export { LocalRuntime } from './runtime/local-runtime';
export type { AgentRuntime } from './runtime/interface';
export type { AgentMessage, AgentRole } from './roles/agent-message';
export { createEventStore } from './events/store';
export { createMemoryStore } from './memory/store';
```

設計原則：
- `apps/superadmin` 只能透過 `index.ts` 匯出 API 使用，不直接 import 套件內部路徑
- 對外 API 變動需語意化版本管理（V1 抽離時沿用）

### 8.4 factory.ts 擴充方向

```typescript
// 現有 factory.ts 需新增 feature flag 判斷：
// AGENT_RUNTIME=local → LocalRuntime
// AGENT_RUNTIME=paperclip → PaperclipRuntime（現行）
// AGENT_RUNTIME=auto → 依 issue tag 動態決定（V1）

function getAgentRuntime(issueId?: string): AgentRuntime {
  const runtimeEnv = process.env.AGENT_RUNTIME ?? 'paperclip';
  
  if (runtimeEnv === 'local') return new LocalRuntime();
  if (runtimeEnv === 'paperclip') return new PaperclipRuntime();
  
  // V1: auto mode — 依 issue metadata 決定
  // if (runtimeEnv === 'auto') return resolveRuntime(issueId);
  
  return new PaperclipRuntime(); // 預設後備
}
```

---

## 9. 雙軌遷移計畫

### 9.1 時程概覽

```
現在（Phase 0）
│  └─ Paperclip 處理所有 Row
│
Phase 1 MVP（第 1–6 週，孵化期）
│  ├─ 在 packages/agent-team 孵化 LocalRuntime
│  ├─ AGENT_RUNTIME=local 僅在試點 Row 啟用
│  ├─ Paperclip 繼續處理非試點 Row
│  └─ 試點期 3 個 Row → 達標後擴展
│
Phase 1.5（第 7–10 週，收斂期）
│  ├─ LocalRuntime 接手 50% 新 Row（基於 tag）
│  ├─ 凍結對外 API（準備抽離）
│  └─ Paperclip 僅接手無 Agent Team tag 的 Row
│
Phase 2 V1（第 11 週起，抽離期）
│  ├─ LocalRuntime 為主 runtime
│  ├─ PaperclipRuntime 為後備（fallback 觸發時啟用）
│  ├─ Hermes MemoryProvider 整合 Lesson Memory
│  └─ 抽離到獨立 repo 並建立版本發布流程
```

### 9.2 遷移安全網

- **feature flag**：`AGENT_RUNTIME` 環境變數，可在不重啟服務的情況下切換
- **流量隔離**：LocalRuntime 使用獨立的 `agent_team_events` 表，不污染 `paperclip_task_events`
- **回滾策略**：任一 issue 失敗 fallback 後，設定 `AGENT_RUNTIME=paperclip` 即可全面回退
- **drain 策略**：切換前等待現有 Paperclip worktree 排水完畢（預估 30 分鐘內）

### 9.3 抽離條件（何時可以獨立專案化）

需同時達成：

- 核心對外 API（`packages/agent-team/src/index.ts`）連續兩個 sprint 無破壞性修改
- 至少 2 個應用可消費同一套 API（例如 superadmin + 第 2 個專案）
- MVP 與 V1 KPI 連續達標 2 週
- 有完整安裝與升級說明（含 fallback 到 Paperclip 的路徑）

---

## 10. 風險登記與對策

| # | 風險名稱 | 可能性 | 衝擊 | 對策 |
|---|---|---|---|---|
| R1 | **規格漂移**：Architect 與 Fullstack 對同一規格產生不同理解 | 高 | 中 | MVP：訊息契約強制 `expected_output` 欄位；V1：CTO 仲裁 |
| R2 | **記憶污染**：錯誤的 lesson 被強化並影響後續任務 | 中 | 高 | V1 初期 lesson 需人工審核 flag；Task Memory 有 TTL |
| R3 | **雙軌治理複雜度**：兩個 runtime 同時運行導致狀態不一致 | 中 | 中 | 事件表按 `runtime` 欄位分區；UI 分開顯示 |
| R4 | **角色衝突自動擴散**：一個角色的錯誤決策連鎖觸發其他角色 | 低 | 高 | 重試上限 3 次；第 4 次強制人工介入 |
| R5 | **成本失控**：多角色呼叫導致 token 費用超出預期 | 中 | 中 | MVP 先監控不限制；V1 加入 per-role budget |
| R6 | **資料主權**：Agent Memory 含有租戶敏感資料 | 低 | 極高 | Trial Row 明確排除多租戶資料；Memory 寫入前強制摘要化 |
| R7 | **Hermes 整合複雜度**：Node 25 + tsx + Hermes Python 混合執行環境衝突 | 中 | 中 | V1 整合時使用編譯後 JS + Python subprocess，不走 tsx runtime（見 `critical-deps.md`） |
| R8 | **過早獨立化**：尚未驗證邊界就拆成獨立 repo，導致 API 反覆破壞 | 中 | 高 | 採 package-first，達成 9.3 抽離條件後才獨立 |

---

## 11. 驗收 KPI 與門檻

### 11.1 MVP 驗收門檻（試點 3 Row）

| KPI | 門檻 | 量測方式 |
|---|---|---|
| **任務完成成功率** | ≥ 80% | `merged` / (`merged` + `failed`) |
| **測試通過率** | ≥ 90% | QA 角色交付的測試結果 |
| **回滾率（fallback 觸發率）** | ≤ 20% | `fallback_triggered` 事件 / 總 issue 數 |
| **平均任務完成時間** | ≤ 現行 Paperclip 的 1.5 倍 | `issue.queued` → `issue.merged` 時間差 |
| **人工介入次數** | ≤ 每 Row 1 次 | 手動 retry / 手動仲裁事件計數 |

### 11.2 V1 擴展門檻（全面啟用條件）

| KPI | 門檻 | 說明 |
|---|---|---|
| **MVP 所有 KPI 連續達標** | 連續 2 週 | 試點期穩定性確認 |
| **Lesson Memory 品質** | 人工審核通過率 ≥ 85% | V1 初期 lesson 審核統計 |
| **每任務平均成本** | ≤ 現行 Paperclip 的 1.3 倍 | API token 費用 / issue 數 |
| **零 P0 事故** | 0 起 | 生產資料外洩、部署失敗影響用戶等 |

### 11.3 No-Go 強制停止條件

以下任一條件觸發時，立即停止 LocalRuntime 流量（`AGENT_RUNTIME=paperclip`）並進行事後分析：

- 連續 3 個 issue 全部 fallback
- 任何 P0 安全事故（資料外洩、未授權 DB 寫入）
- 任務完成成功率連續 3 天低於 60%

---

## 12. 第一批 2 週 Sprint 執行清單

### 12.1 Sprint 範圍（對應 M0 + M1 + M2）

- M0：建立 `packages/agent-team` 可消費套件骨架
- M1：建立角色訊息契約與 runtime 介面型別
- M2：提供最小可用 `LocalRuntime`（create/status 主流程）

### 12.2 建議工作項與檔案落點

| ID | 工作項 | 目標檔案 | 交付標準 |
|---|---|---|---|
| S1 | 建立套件骨架與編譯設定 | `packages/agent-team/package.json`、`packages/agent-team/tsconfig.json` | 可被 workspace 識別，`build` 指令可執行 |
| S2 | 建立對外匯出入口 | `packages/agent-team/src/index.ts` | 所有公開型別與 runtime 由單一入口匯出 |
| S3 | 建立角色訊息契約 | `packages/agent-team/src/roles/agent-message.ts` | 完成 `AgentRole`、`MessageIntent`、`AgentMessage` |
| S4 | 建立 runtime 介面 | `packages/agent-team/src/runtime/interface.ts` | 與 `apps/superadmin/lib/agent-runtime/interface.ts` 邊界對齊 |
| S5 | 建立 LocalRuntime 最小實作 | `packages/agent-team/src/runtime/local-runtime.ts` | `createIssue`、`fetchIssueStatus` 可回傳有效結果 |
| S6 | 建立事件與記憶 store placeholder | `packages/agent-team/src/events/store.ts`、`packages/agent-team/src/memory/store.ts` | 先提供 in-memory/mock 實作，保留未來 Supabase 擴充點 |
| S7 | Superadmin runtime 工廠接入套件 | `apps/superadmin/lib/agent-runtime/factory.ts` | `AGENT_RUNTIME=local` 可切換到 package 的 LocalRuntime |
| S8 | 基礎測試與型別驗證 | `packages/agent-team/src/**/*.test.ts`、既有測試入口 | 至少涵蓋匯出 API、介面相容性、LocalRuntime 初始化 |

### 12.3 依賴順序

1. S1 → S2（先讓套件可被引用）
2. S3 + S4（平行處理）
3. S5（依賴 S4）
4. S6（可與 S5 平行）
5. S7（依賴 S2 + S5）
6. S8（最後收斂）

### 12.4 每日節奏建議（10 個工作天）

| 天數 | 主要重點 |
|---|---|
| Day 1 | S1、S2 |
| Day 2 | S3 |
| Day 3 | S4 |
| Day 4–5 | S5 |
| Day 6 | S6 |
| Day 7 | S7 |
| Day 8–9 | S8 + bugfix |
| Day 10 | Sprint Demo + Retro + 下一批規劃 |

### 12.5 Sprint DoD（Definition of Done）

- `packages/agent-team` 可被 `apps/superadmin` 正常匯入
- `AGENT_RUNTIME=paperclip` 行為與現況一致（不得回歸）
- `AGENT_RUNTIME=local` 可完成最小 create/status 流程
- 所有新增型別可被 TypeScript strict 模式通過
- 有最小測試覆蓋（至少匯出 API 與 LocalRuntime 初始化）

---

## 13. Issue Tracker 任務卡模板（S1-S8）

以下可直接貼進 issue tracker（Jira / GitHub Issues / Linear）。

### S1 建立套件骨架與編譯設定

- **標題**：S1 - 建立 packages/agent-team 套件骨架
- **描述**：建立 workspace 套件基本結構與編譯設定，讓其他 app 可以透過 workspace 依賴引用
- **目標檔案**：`packages/agent-team/package.json`、`packages/agent-team/tsconfig.json`
- **驗收條件**：
  - workspace 可辨識 `packages/agent-team`
  - 套件 `build` 指令可成功執行
  - 不影響現有 workspace 套件
- **風險與備註**：避免改到 root workspace 設定造成其他套件建構失敗
- **預估**：0.5 天

### S2 建立對外匯出入口

- **標題**：S2 - 建立 agent-team 對外 API 入口
- **描述**：建立 `src/index.ts` 並統一管理對外匯出 API，禁止外部直接引用內部路徑
- **目標檔案**：`packages/agent-team/src/index.ts`
- **驗收條件**：
  - 角色型別與 runtime 介面可由單一入口匯出
  - 不出現 `../../internal` 類型匯入給外部 app
- **風險與備註**：後續 API 變更需維持向後相容
- **預估**：0.5 天

### S3 建立角色訊息契約

- **標題**：S3 - 定義 AgentMessage 與角色協作型別
- **描述**：建立角色間訊息契約，確保多角色協作流程的型別一致性
- **目標檔案**：`packages/agent-team/src/roles/agent-message.ts`
- **驗收條件**：
  - `AgentRole`、`MessageIntent`、`MessageStatus`、`AgentMessage` 定義完成
  - 型別可被 `apps/superadmin` 正常匯入與使用
- **風險與備註**：欄位命名需與事件表 payload 命名一致
- **預估**：1 天

### S4 建立 Runtime 介面

- **標題**：S4 - 建立 packages 版本 AgentRuntime 介面
- **描述**：在套件內定義 runtime 介面，對齊現有 superadmin 使用邊界
- **目標檔案**：`packages/agent-team/src/runtime/interface.ts`
- **驗收條件**：
  - `createIssue`、`updateIssue`、`fetchIssueStatus`、`fetchIssueCost`、`fetchIssueRunLog` 齊備
  - 與現行 `apps/superadmin/lib/agent-runtime/interface.ts` 語義一致
- **風險與備註**：避免介面分歧導致接入時雙版本維護
- **預估**：1 天

### S5 建立 LocalRuntime 最小實作

- **標題**：S5 - 建立 LocalRuntime MVP 骨架
- **描述**：提供最小可用 LocalRuntime，先打通 create/status 路徑
- **目標檔案**：`packages/agent-team/src/runtime/local-runtime.ts`
- **驗收條件**：
  - `createIssue` 可回傳有效 issue 結果
  - `fetchIssueStatus` 可回傳狀態
  - 失敗時不影響 `AGENT_RUNTIME=paperclip` 路徑
- **風險與備註**：先用 mock/in-memory，避免提早綁死資料儲存實作
- **預估**：2 天

### S6 建立事件與記憶 Store Placeholder

- **標題**：S6 - 建立 events/memory store placeholder
- **描述**：建立可替換 store 介面與最小實作，為後續 Supabase 接入保留擴充點
- **目標檔案**：`packages/agent-team/src/events/store.ts`、`packages/agent-team/src/memory/store.ts`
- **驗收條件**：
  - `createEventStore`、`createMemoryStore` 可由 `index.ts` 匯出
  - LocalRuntime 可注入並使用 store
- **風險與備註**：避免在 MVP 階段過度設計資料層
- **預估**：1 天

### S7 Superadmin Runtime 工廠接入套件

- **標題**：S7 - apps/superadmin 接入 agent-team 套件
- **描述**：在 runtime 工廠中支援從套件初始化 LocalRuntime
- **目標檔案**：`apps/superadmin/lib/agent-runtime/factory.ts`
- **驗收條件**：
  - `AGENT_RUNTIME=local` 時可建立 package 版 LocalRuntime
  - `AGENT_RUNTIME=paperclip` 行為不變
- **風險與備註**：不得破壞既有 Paperclip 任務流程
- **預估**：1 天

### S8 基礎測試與型別驗證

- **標題**：S8 - 建立套件最小測試與型別驗證
- **描述**：為新增套件建立最小測試網，確保 API 與初始化流程穩定
- **目標檔案**：`packages/agent-team/src/**/*.test.ts`（或對應測試目錄）
- **驗收條件**：
  - 對外匯出 API 有測試覆蓋
  - LocalRuntime 初始化與 create/status 有基本測試
  - TypeScript strict 模式通過
- **風險與備註**：測試先求穩定最小覆蓋，避免首批過度投入 E2E
- **預估**：1 天

---

## 附錄：相關設計文件

| 文件 | 說明 |
|---|---|
| [agent-team-strategy-one-pager.md](./agent-team-strategy-one-pager.md) | 一頁式決策版（本文配套） |
| [docs/technical-selection/agent-runtime-design-principles.md](../technical-selection/agent-runtime-design-principles.md) | 現有 Runtime 抽象設計原則（Phase 0/1/2 路線） |
| [.claude/rules/backend/ai-adapter.md](../../.claude/rules/backend/ai-adapter.md) | Adapter provider/model 命名規則 |
| [.claude/skills/dispatch-agents/SKILL.md](../../.claude/skills/dispatch-agents/SKILL.md) | 現行派工流程（MVP 運營模板） |
| [hermes-agent/agent/memory_provider.py](../../hermes-agent/agent/memory_provider.py) | Hermes 記憶介面（V1 整合參考） |
