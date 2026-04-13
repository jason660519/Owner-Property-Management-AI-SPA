# Token 節省指南 — AI 工程師必讀

> **建立日期**: 2026-04-13 | **位置**: `docs/operational-guides/token-saving-guide.md`
> **適用對象**: 所有在本專案中工作的 AI Agent（Claude Code、Codex、Cursor Agent、Paperclip 等）
> **目的**: 減少不必要的 token 消耗，提高工作效率與降低 API 成本

---

## 1. Custom Commands（最省）

一句話觸發完整流程，不需要來回對話。

| 指令 | 用途 | 位置 |
|:-----|:-----|:-----|
| `/daily-report` | 自動產生每日進度報告 + 更新 roadmap + 判斷是否建 VIS issue | `.claude/commands/daily-report.md` |
| `/commit-push-pr` | 一鍵 commit + push + 開 PR | `.claude/commands/commit-push-pr.md` |
| `/roadmap-update` | 更新 roadmap.ts 進度 | `.claude/commands/roadmap-update.md` |
| `/test-coverage` | 為檔案產生測試並確認通過 | `.claude/commands/test-coverage.md` |

**省 token 原理**：流程已寫死在 command 檔案中，AI 不需要從零推理應該怎麼做。

---

## 2. Skills（預載專業知識）

Skills 讓 AI 不用從頭學習框架用法，直接按 skill 指南操作。

### 專案級 Skills（`.claude/skills/`）

| Skill | 觸發方式 | 用途 |
|:------|:---------|:-----|
| `playwright-cli` | `/playwright-cli` | 瀏覽器自動化（比 Playwright MCP 省 token） |
| `create-tanstack-table` | `/create-tanstack-table` | 建立 EnhancedTable 表格組件 |
| `python-security-scan` | `/python-security-scan` | Python 安全掃描 |

### 全域 Skills（`~/.claude/skills/`）

| Skill | 用途 |
|:------|:-----|
| `coding-standards` | TypeScript/React 程式碼風格 |
| `frontend-patterns` | React/Next.js 前端模式 |
| `backend-patterns` | API/DB 後端模式 |
| `tdd-workflow` | TDD 開發流程 |
| `security-review` | 安全審查清單 |
| `strategic-compact` | 智慧壓縮上下文，避免 context 溢出 |
| `continuous-learning` | 自動從工作中學習新模式 |

**省 token 原理**：一次載入專業知識，不需要在每次對話中重新描述框架慣例。

---

## 3. CLAUDE.md + .claude/rules/（自動載入規則）

每次對話啟動時自動載入，不需要手動貼規則。

| 檔案 | 內容 |
|:-----|:-----|
| `CLAUDE.md` | 專案硬性規定、架構、常用指令、已知陷阱 |
| `AGENTS.md` | 同上，給 OpenAI-compatible agents 用 |
| `.claude/rules/general.md` | 命名規範、Git 工作流、語言偏好 |
| `.claude/rules/backend/supabase.md` | Supabase SDK 初始化規則 |
| `.claude/rules/frontend/react-next.md` | Next.js/React 開發要點 |

**省 token 原理**：規則自動注入 context，AI 不需要每次都去翻文件確認。

---

## 4. 瀏覽器工具優先序（由省到費）

操作瀏覽器是最耗 token 的動作之一（每次 snapshot → 分析 → 動作都是一輪 API call）。

### 工具清單與優先序

```
1️⃣ 專用 MCP（Gmail / Calendar / Vercel / Supabase）
   → API 直達，零瀏覽器開銷

2️⃣ Claude Preview（mcp__Claude_Preview__*）
   → dev server 預覽，快速驗證改動

3️⃣ Playwright CLI（bash tools/testing/playwright-cli.sh）
   → 批次指令，一次 bash call 跑多步 ⭐ 省 token 首選

4️⃣ Playwright MCP（mcp__plugin_playwright_playwright__*）
   → 逐步探索，需要 snapshot 判斷時使用

5️⃣ Chrome DevTools（mcp__chrome-devtools__*）
   → 效能分析、Network/Console 除錯

6️⃣ Computer Use（mcp__computer-use__*）
   → 桌面原生 App，最後手段
```

### Playwright CLI vs Playwright MCP 差異

| | Playwright CLI | Playwright MCP |
|:--|:--|:--|
| **呼叫方式** | `bash tools/testing/playwright-cli.sh <cmd>` | `mcp__plugin_playwright_playwright__browser_*` |
| **Token 消耗** | **低**（一次 bash 跑完） | **高**（每步都要 snapshot 來回） |
| **適合** | 已知流程、腳本式操作 | 探索未知頁面、需要逐步判斷 |
| **可組合** | 可在一次 bash 中串接多個指令 | 每個動作獨立一次 tool call |

### 範例對比

**❌ 高 token 消耗（Playwright MCP，6 次 tool call）：**
```
1. browser_navigate → http://localhost:3001/login
2. browser_snapshot → 讀取頁面結構
3. browser_type ref=e1 "email@test.com"
4. browser_type ref=e2 "password"
5. browser_click ref=e3 (登入按鈕)
6. browser_snapshot → 確認結果
```

**✅ 低 token 消耗（Playwright CLI，2 次 bash call）：**
```bash
# 一次 bash call 完成開啟 + 導航
bash tools/testing/playwright-cli.sh open http://localhost:3001/login

# 一次 bash call 完成填表 + 點擊
bash tools/testing/playwright-cli.sh fill e1 "email@test.com"
bash tools/testing/playwright-cli.sh fill e2 "password" --submit
```

---

## 5. Agent 委派（分散 context）

當主對話 context 過長時，委派子 agent 執行獨立任務。

| 方式 | 適用場景 |
|:-----|:---------|
| `Agent` tool（`subagent_type: "Explore"`） | 搜尋程式碼、探索 codebase |
| `Agent` tool（`subagent_type: "Plan"`） | 設計架構方案 |
| `Agent` tool（`run_in_background: true`） | 不阻塞主對話的獨立任務 |

**省 token 原理**：子 agent 有自己的 context window，不會佔用主對話的 token 額度。

---

## 6. Context7 MCP（查文件不靠記憶）

查 library 文件時用 Context7 而非 web search。

```
✅ 用 Context7：resolve-library-id → query-docs → 得到精準文件片段
❌ 用 Web Search：搜尋 → 抓網頁 → 解析 HTML → 過濾雜訊（多消耗 3-5x token）
```

設定見 `~/.claude/rules/context7.md`。

---

## 7. 實用小技巧

| 技巧 | 說明 |
|:-----|:-----|
| **Read 指定行數** | `Read file offset=100 limit=50` 而非讀整個檔案 |
| **Grep 而非 Read** | 搜尋關鍵字用 `Grep`，不要 Read 整檔再人工找 |
| **Glob 而非 find** | 找檔案用 `Glob`，不要用 `bash find` |
| **避免重複讀** | Edit/Write 成功後不需 Read 回來驗證 |
| **批次 tool call** | 獨立的 tool call 放同一個 message 並行執行 |
| **snapshot > screenshot** | 瀏覽器用 snapshot（文字）而非 screenshot（圖片），文字省 token |

---

## 8. 總結：省 Token 效果排序

```
🥇 Custom Commands（/daily-report, /commit-push-pr）
   → 一句話觸發完整流程

🥈 Skills（/playwright-cli, /create-tanstack-table）
   → 預載專業知識，不從零推理

🥉 CLAUDE.md + .claude/rules/
   → 自動載入規則，不需手動貼

4️⃣ Playwright CLI > Playwright MCP
   → 批次 bash > 逐步 snapshot

5️⃣ Agent 委派
   → 子 agent 獨立 context

6️⃣ Context7 > Web Search
   → 精準文件片段 > 整頁 HTML

7️⃣ 工具使用小技巧
   → Read 指定行、Grep 搜尋、批次 tool call
```
