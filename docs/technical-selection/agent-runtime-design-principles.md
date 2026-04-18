# Agent Runtime — 設計原則

**最後更新**：2026/04/19
**狀態**：Phase 0 上線（PaperclipRuntime 為唯一實作）
**位置**：`apps/superadmin/lib/agent-runtime/`

---

## 為什麼有這一層

歷史上，專案的 Agent 派工全部走 Paperclip HTTP 服務（`localhost:3187`）：

- 24 個 `/api/paperclip/*` route 是 Paperclip 的 wrapper
- `lib/paperclip/client.ts` 是唯一的 HTTP 客戶端
- 資料主權在 Paperclip DB，不在我們的 Supabase
- Docker-only runtime，升級節奏不可控
- 碰過的黑盒：「Process lost」、`executionRunId` 被清除後拿不回 run 歷史

**戰略目標**：擺脫 Paperclip 生態綁架，但**不要大爆炸重寫**。採 Strangler
Pattern——從 Paperclip 旁邊長出新系統，慢慢絞殺舊的。

**Phase 0**（本份文件對應）：建立抽象層，讓 route 不再直接 import
Paperclip HTTP 客戶端。**不新增功能**，只引入 seam。

**Phase 1**（未來）：實作 `LocalRuntime`（Supabase + `child_process.spawn`），
新派的 row 走 LocalRuntime，Paperclip 上的 in-flight rows 跑完為止。

**Phase 2/3**（未來）：drain Paperclip → 關閉 docker → 刪 wrapper。

---

## 架構

```
Route handler (/api/paperclip/*)
    │
    ▼
getAgentRuntime()                    ← factory，讀 AGENT_RUNTIME env
    │
    ▼
AgentRuntime interface               ← 只定義真正跨網路的 5 個方法
    │
    ├── PaperclipRuntime (現行)      ← 包裝 lib/paperclip/client.ts
    │        │
    │        ▼
    │   Paperclip HTTP service
    │
    └── LocalRuntime (Phase 1 未實作)
             │
             ▼
        Supabase + child_process.spawn(claude | codex | opencode | ...)
```

**關鍵界線**：只有**真正打 Paperclip HTTP API 的函數**才進 runtime interface。
本地的 git worktree、GitHub PR、merge history、polling 邏輯等留在
`lib/paperclip/` 下，因為它們在 LocalRuntime 時代依然是一樣的操作。

---

## Interface 當前 surface

| 方法 | 用途 | 對應 Paperclip endpoint |
|---|---|---|
| `createIssue` | 建立 issue（派工） | `POST /api/companies/:id/issues` |
| `updateIssue` | 改 status / 指派 agent | `PATCH /api/issues/:id` |
| `fetchIssueStatus` | 查 issue 狀態 | `GET /api/issues/:id` |
| `fetchIssueCost` | 查成本（two-hop） | `GET /api/issues/:id` → `GET /api/heartbeat-runs/:runId` |
| `fetchIssueRunLog` | 查最新 run 的 stdout/stderr | 同上 |

**沒在 interface 裡的**（刻意排除）：
- `listAgents` / `getAgent` / adapter 切換 → adapter-fallback.ts 自有邏輯
- Worktree / PR / merge → 本地 git 操作，與 runtime 無關
- Cron / heartbeat polling → 本地排程，與 runtime 無關
- 信用額度守門 → anthropic-credit-guard.ts 獨立層

這些在 Phase 1 可能被整合，但 Phase 0 維持最小切面。

---

## 從 Paperclip 擷取（但不依賴）的設計理念

這些理念是 Paperclip 做得對、值得在 LocalRuntime 繼承的：

| # | 理念 | Paperclip 做法 | LocalRuntime 規劃 |
|---|---|---|---|
| 1 | **Worktree-per-issue** | 每個 issue 一個 `.paperclip-worktrees/<slug>/` | ✅ 直接繼承，改用 `git worktree add` 原生指令 |
| 2 | **Heartbeat pickup** | agents 輪詢 `/api/issues?status=todo` 自撿 | ✅ 改 Supabase realtime subscribe，省輪詢 |
| 3 | **Adapter × Model 兩層分離** | CLI 選擇 + 獨立 model 下拉 | ✅ 直接用 `adapter-config.ts` 的 `ADAPTER_CONFIG_ITEMS` |
| 4 | **Role-based agent** | CEO / Architect / CTO / Database / DevOps / Fullstack / QA / UI-UX | ✅ 每個 role 的 system prompt 放 `.claude/rules/agent-roles/` |
| 5 | **Lifecycle states** | `queued → running → succeeded/failed/errored` | ✅ + 加 `paused`、`blocked`、`waiting_review` |
| 6 | **Max turns + skip permissions** | 批次作業友善 | ✅ 直接沿用 |
| 7 | **Run-log streaming** | ⚠️ 只有 raw stdout excerpt（踩過的雷）| ✅ **結構化**分欄：`touched_files`、`commits`、`errors`、`outcome` |
| 8 | **Per-issue config override** | UI 可改 adapter / model / thinking / maxTurns | ✅ + JSON Schema 驗證 |
| 9 | **Issue ↔ VCS 關聯** | `executionRunId` + `checkoutRunId` | ✅ + commit SHA 直接關聯，不靠內部 runId |

---

## 我們不沿襲 Paperclip 的做法

**被 Paperclip 設計限制了，我們要改進**：

| Paperclip 現況 | LocalRuntime 改進 |
|---|---|
| Run 結束後清除 `executionRunId` | 永久保留，歷史 run 可查 |
| Run-log 只有 raw stdout excerpt | 結構化拆欄，含 `touched_files` |
| 資料主權在 Paperclip DB | 存自己 Supabase（可 join `roadmap.ts`、`test-manifest.json`） |
| Docker-only，升級看 Paperclip 心情 | 純 Node.js `spawn`，自己掌控 |
| 「Process lost」黑盒錯誤 | 標準化錯誤分類（`adapter_failure` / `worktree_conflict` / `timeout` / ...） |
| UI 是 Paperclip 自己的 `localhost:3187` | Superadmin 自有 UI |

---

## 擴充規範（未來新增方法時）

**何時加新方法到 `AgentRuntime` interface？**

僅當該操作**真正跨網路到 agent backend**，且**兩個實作都需要**：

- ✅ 對：`createIssue` —— Paperclip 用 HTTP，LocalRuntime 會寫 Supabase，都是跨層
- ❌ 不對：`listWorktrees` —— 本地 git 指令，runtime 無關
- ❌ 不對：`getMergeHistory` —— 讀本地 merge-history.json，runtime 無關

**每個新方法的檢查清單**：

1. [ ] 定義 `<Method>Input`（去掉 transport config）
2. [ ] 定義 `<Method>Result` discriminated union（`{ ok: true, ... } | { ok: false, status, error, detail? }`）
3. [ ] 實作 `PaperclipRuntime.<method>()`
4. [ ] （未來）實作 `LocalRuntime.<method>()`
5. [ ] Routes 呼叫時都走 `getAgentRuntime()`
6. [ ] 測試 mock 放在 interface 層級，不綁特定實作

**錯誤紀律**（和 `lib/paperclip/client.ts` 一致）：
- **永不 throw**
- 回傳 `{ ok: false, status, error, detail? }`
- `status: 0` 代表網路錯誤
- `status: 500+` 代表 backend 錯誤
- UI 可直接把 `error` 字串顯示給使用者

---

## 環境變數

| 變數 | 用途 | 預設 |
|---|---|---|
| `AGENT_RUNTIME` | 選擇 backend：`paperclip`（預設）或 `local`（Phase 1 未實作） | `paperclip` |
| `NEXT_PUBLIC_PAPERCLIP_BASE_URL` | PaperclipRuntime 用 | （必填） |
| `PAPERCLIP_API_KEY` | PaperclipRuntime 用 | （必填） |
| `NEXT_PUBLIC_PAPERCLIP_COMPANY_ID` | PaperclipRuntime 用 | （必填） |

切換到 `AGENT_RUNTIME=local` 目前會回 501 Not Implemented，保留給 Phase 1。

---

## 路徑表

| 概念 | 檔案 |
|---|---|
| Interface 定義 | [apps/superadmin/lib/agent-runtime/interface.ts](../../apps/superadmin/lib/agent-runtime/interface.ts) |
| PaperclipRuntime 實作 | [apps/superadmin/lib/agent-runtime/paperclip-runtime.ts](../../apps/superadmin/lib/agent-runtime/paperclip-runtime.ts) |
| Factory | [apps/superadmin/lib/agent-runtime/factory.ts](../../apps/superadmin/lib/agent-runtime/factory.ts) |
| Public API | [apps/superadmin/lib/agent-runtime/index.ts](../../apps/superadmin/lib/agent-runtime/index.ts) |
| Row context API（配套，用於 dispatch 交接） | [apps/superadmin/app/api/roadmap/context/\[rowId\]/route.ts](../../apps/superadmin/app/api/roadmap/context/%5BrowId%5D/route.ts) |
| 新 prompt builder | `buildContextAwareDispatchPrompt()` in [apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/task-dispatch/prompt-templates.ts](../../apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/task-dispatch/prompt-templates.ts) |

---

## 下一步（Phase 1 規劃）

- [ ] Supabase schema：`internal_agents`, `internal_issues`, `internal_runs`, `internal_run_events`
- [ ] `LocalRuntime` 實作：
  - [ ] `createIssue`：寫 Supabase + `git worktree add`
  - [ ] `pickup` cron：撿 idle agent + claim issue
  - [ ] `spawn`：`child_process.spawn('claude'|'codex'|'opencode'|...)`
  - [ ] `streamLog`：stdout/stderr → Supabase（結構化分欄）
  - [ ] `merge`：用 `gh` CLI 自動開 PR
- [ ] 認 `roadmap.ts` + 注入 `.claude/rules/`
- [ ] 認 `test-manifest.json`
- [ ] Feature flag 切換（`AGENT_RUNTIME=local`）drain Paperclip
