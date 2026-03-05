# Claude Code 整合指南 (MCP Servers + Skills/Plugins)

> **創建日期**: 2026-01-30
> **創建者**: Project Team
> **最後修改**: 2026-02-13
> **修改者**: Claude Opus 4.6
> **版本**: 2.0
> **文件類型**: 開發指南

---

## 📖 概覽

本指南涵蓋 Claude Code 開發環境的兩大核心擴展系統：

1. **MCP Servers**（Model Context Protocol）：外部工具與資料源整合
2. **Skills/Plugins**：內建或可安裝的開發技能模組

---

## 🎯 Part 1: Skills/Plugins（開發技能模組）

### 1.1 已安裝的 Plugins

| Plugin | 用途 | 調用方式 | 狀態 |
|:-------|:-----|:---------|:-----|
| **document-skills** | 文檔處理相關功能 | 自動啟用 | ✅ |
| **everything-claude-code** | 全面的 Claude Code 增強功能 | 自動啟用 | ✅ |
| **commit-commands** | Git commit 輔助 | `/commit` | ✅ |
| **feature-dev** | 功能開發輔助 | `/feature-dev` | ✅ |
| **agent-sdk-dev** | Agent SDK 開發工具 | `/new-sdk-app` | ✅ |
| **frontend-design** | 前端設計輔助（避免 AI 通用風格） | `/frontend-design` | ✅ |
| **playwright** | E2E 測試支援 | `/playwright` | ✅ |
| **supabase** | Supabase 整合工具 | `/supabase` | ✅ |
| **context7** | 最新技術文檔查詢（React, Next.js 等） | 自動啟用（MCP） | ✅ |
| **security-guidance** | 安全檢查與建議 | `/security-review` | ✅ |

---

### 1.2 系統內建 Skills

| Skill | 用途 | 調用方式 | 適用場景 |
|:------|:-----|:---------|:---------|
| **keybindings-help** | 自訂鍵盤快捷鍵 | 直接請求 | 修改 ~/.claude/keybindings.json |
| **clickhouse-io** | ClickHouse 查詢優化 | 直接請求 | 高性能分析查詢 |
| **coding-standards** | TypeScript/React/Node.js 最佳實踐 | 直接請求 | 程式碼審查 |
| **backend-patterns** | 後端架構、API 設計 | 直接請求 | Node.js/Express/Next.js API |
| **design-md** | 分析並生成 DESIGN.md | 直接請求 | 設計系統文檔化 |
| **continuous-learning** | 自動提取可重用模式 | 自動啟用 | 知識累積 |
| **tdd-workflow** | 測試驅動開發（80%+ 覆蓋率） | 直接請求 | 新功能/重構 |
| **frontend-patterns** | React/Next.js/狀態管理最佳實踐 | 直接請求 | 前端開發 |
| **security-review** | 安全性檢查清單 | 直接請求 | 身份驗證/API/支付 |
| **strategic-compact** | 手動壓縮上下文 | 自動建議 | 長對話優化 |
| **python-security-scan** | Python 安全掃描（Flask/Django/FastAPI） | 直接請求 | Python 專案審計 |

---

### 1.3 如何使用 Skills

#### 方法 1：斜槓命令（適用於已安裝 Plugins）
```bash
/commit              # 調用 commit-commands skill
/feature-dev         # 調用 feature-dev skill
/frontend-design     # 調用 frontend-design skill
/security-review     # 調用 security-review skill
```

#### 方法 2：直接請求（適用於系統內建 Skills）
```
請用 TDD 工作流程幫我開發一個用戶認證功能
請用 coding-standards 檢查這段程式碼
請用 security-review 檢查這個 API endpoint
```

#### 方法 3：自動啟用（根據情境觸發）
某些 Skills 會根據對話內容自動啟用，例如：
- `continuous-learning`：自動學習並記錄可重用模式
- `strategic-compact`：在適當時機建議壓縮上下文

---

### 1.4 Skills 使用策略（根據專案規範）

根據 `CLAUDE.md` 的設定：

**優先級**：
```
.claude/rules/ > .claude/skills/ > 系統 Skills
```

**政策**：
- **禁止主動使用系統 Skills**（如 `coding-standards`、`frontend-patterns` 等）
- **僅在明確要求時調用**
- **專案規範以 `.claude/rules/` 為準**

**範例**：
```
❌ 錯誤：AI 主動使用 coding-standards skill
✅ 正確：用戶明確說「請用 coding-standards 檢查」

❌ 錯誤：忽略 .claude/rules/frontend/react-expo.md
✅ 正確：優先遵循專案規範，必要時才輔以 Skills
```

---

### 1.5 測試 Skills

#### 測試 Frontend Design Skill
```
請用 /frontend-design 創建一個物件卡片組件，要求避免 AI 通用風格
```

#### 測試 Feature Dev Skill
```
請用 /feature-dev 幫我規劃「房東儀表板」功能
```

#### 測試 Security Review Skill
```
請用 /security-review 檢查我的 API 路由：apps/web/app/api/properties/route.ts
```

#### 測試 TDD Workflow Skill
```
請用 TDD 工作流程幫我開發「物件搜尋過濾」功能，要求 80%+ 測試覆蓋率
```

---

## 🚀 Part 2: MCP Servers（外部工具整合）

### 2.1 已安裝的 MCP Servers

| MCP Server | 用途 | 狀態 | 需要配置 |
|:-----------|:-----|:-----|:---------|
| **context7** | 查詢最新技術文檔（React, Expo, Supabase 等） | ✅ 已配置 | 已完成 |
| **brave-search** | 使用 Brave Search API 進行網路搜尋 | ✅ 已配置 | 已完成 |
| **postgres** | 直接操作 PostgreSQL/Supabase 資料庫 | ✅ 已配置 | 已完成 |
| **playwright** | Chrome 瀏覽器自動化和測試 | ✅ 已配置 | 不需要 |
| **filesystem** | 檔案系統操作（讀寫檔案） | ✅ 已配置 | 不需要 |
| **github** | GitHub 倉庫管理和操作 | ✅ 已配置 | 已完成 |
| **slack** | Slack 訊息發送和頻道管理 | ⚠️ 需要配置 | 需要 Token |
| **memory** | AI 專案知識記憶系統 | ✅ 已配置 | 不需要 |
| **time** | 時區處理和時間計算 | ✅ 已配置 | 不需要 |
| **fetch** | HTTP 請求和 API 測試 | ✅ 已配置 | 不需要 |

---

### 2.2 快速啟動（不需額外配置）

以下 MCP servers 已經可以直接使用：

#### 1. Context7（技術文檔查詢）
```bash
# 自動使用，已配置 API Key
# 可以查詢：React, Expo, Supabase, TypeScript, PostgreSQL 等最新文檔
```

**範例**：
```
請查詢 React 19 的 useActionState hook 使用方式
請查詢 Next.js 15 的 App Router 最佳實踐
```

#### 2. Brave Search（網路搜尋）
```bash
# 自動使用，已配置 API Key
# 可用於搜尋最新技術資訊、房地產市場行情等
```

**範例**：
```
搜尋 2026 年台北市租屋市場趨勢
搜尋 Supabase RLS 最佳實踐 2026
```

#### 3. PostgreSQL（資料庫操作）
```bash
# 自動使用，已連接本地 Supabase
# 可直接查詢、修改資料庫
```

**範例**：
```
列出資料庫中的所有 tables 和它們的欄位
查詢 public.properties 的前 10 筆資料
```

#### 4. Playwright（瀏覽器自動化）
```bash
# 自動使用，無需配置
# 可用於網頁測試、截圖、爬蟲等
```

**範例**：
```
開啟 http://localhost:3000 並截圖首頁
測試登入流程並檢查是否跳轉到儀表板
```

#### 5. Filesystem（檔案操作）
```bash
# 自動使用，已綁定專案根目錄
# 路徑：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA
```

**範例**：
```
讀取 apps/web/app/page.tsx
在 docs/ 資料夾建立新的設計文檔
```

#### 6. GitHub（倉庫管理）
```bash
# 自動使用，已配置 Personal Access Token
# 可管理 Issues, PRs, Commits 等
```

**範例**：
```
查看最近 5 個 commits 的訊息
列出所有開放的 issues
創建一個新的 PR
```

#### 7. Memory（AI 專案記憶 / auto memory folder）
```bash
# 專案內記憶檔位置：.claude/memory/
# 檔案：MEMORY.md（索引）、architecture.md、features.md
# AI 可讀取專案特定知識、慣例與進度，可隨 /memory 指令或規則引用
```

**專案記憶路徑**：`<專案根目錄>/.claude/memory/`（已納入版控，與規則同目錄）

**範例**：
```
記住：本專案的主要使用者是房東，他們需要管理出租和出售物件
稍後測試：這個專案的主要使用者是誰？
```

#### 8. Time（時間處理）
```bash
# 自動使用，無需配置
# 處理時區轉換、預約時間計算等
```

**範例**：
```
計算從現在起 30 天後是幾月幾日？（用於租約到期提醒）
轉換 UTC 時間到台北時間
```

#### 9. Fetch（HTTP 客戶端）
```bash
# 自動使用，無需配置
# 測試 API endpoints、整合第三方服務
```

**範例**：
```
測試本地 Supabase API 是否正常：GET http://127.0.0.1:54321/rest/v1/
呼叫 Google Maps Geocoding API
```

---

### 2.3 需要配置的 MCP Servers

#### Slack（訊息通知系統）⚠️ 唯一需要額外配置

**用途**：
- 發送物件預約通知
- 系統錯誤告警
- 房東/房客互動提醒
- 租約到期通知

**配置步驟**：

##### Step 1: 建立 Slack App
1. 前往 [Slack API](https://api.slack.com/apps)
2. 點擊 "Create New App" → "From scratch"
3. 輸入 App 名稱（如：`Property Management Bot`）
4. 選擇您的 Workspace

##### Step 2: 設定權限
1. 在 "OAuth & Permissions" 頁面
2. 在 "Bot Token Scopes" 添加以下權限：
   - `chat:write` - 發送訊息
   - `channels:read` - 讀取頻道列表
   - `channels:history` - 讀取頻道訊息
   - `users:read` - 讀取用戶資訊

##### Step 3: 安裝到 Workspace
1. 在 "OAuth & Permissions" 點擊 "Install to Workspace"
2. 授權後會獲得 **Bot User OAuth Token**（格式：`xoxb-...`）

##### Step 4: 取得 Team ID
1. 在 "Basic Information" 頁面找到 **Team ID**

##### Step 5: 配置環境變數
在 `.env` 檔案中添加：
```bash
# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_TEAM_ID=T01234567
```

完成後重啟 Claude Code 即可使用！

---

### 2.4 PostgreSQL/Supabase 配置（進階）

**本地開發**：
1. 取得 Supabase 資料庫連接字串：
   ```bash
   supabase status
   # 複製 DB URL，格式類似：
   # postgresql://postgres:postgres@localhost:54322/postgres
   ```

2. 在 `.env` 檔案中添加：
   ```bash
   POSTGRES_CONNECTION_STRING=postgresql://postgres:your_password@localhost:54322/postgres
   ```

3. 更新 `.claude/.mcp.json`：
   ```json
   "postgres": {
     "env": {
       "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}"
     }
   }
   ```

**生產環境**：
- 從 Supabase Dashboard → Settings → Database 複製連接字串
- 格式：`postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres`

---

### 2.5 啟用/停用 MCP Server

#### 停用某個 MCP Server
編輯 `.claude/.mcp.json`，將 `disabled` 設為 `true`：

```json
"brave-search": {
  "disabled": true  // 停用此 server
}
```

#### 完全移除
直接從 `.mcp.json` 刪除對應的配置區塊。

---

## 📝 環境變數範本

在專案根目錄創建或編輯 `.env` 檔案：

```bash
# Supabase Configuration（✅ 已配置）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# MCP Servers API Keys（✅ 已配置）
CONTEXT7_API_KEY=your_context7_api_key
BRAVE_API_KEY=your_brave_api_key
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token

# Slack Integration（⚠️ 需要配置）
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_TEAM_ID=T01234567

# AI Model APIs（✅ 已配置）
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

---

## ⚠️ 安全注意事項

1. **.env 檔案已在 .gitignore**：敏感資訊不會被提交到 Git
2. **不要將 API Keys 直接寫在 .mcp.json**：使用環境變數
3. **本地開發與生產環境分離**：使用不同的 `.env` 檔案
4. **Skills 政策遵循**：根據 `.claude/rules/` 設定，禁止主動使用系統 Skills

---

## 🛠️ 常見問題

### Q: MCP Server 無法啟動？
**A**: 檢查是否有安裝 Node.js，執行 `node --version` 確認。

### Q: Postgres MCP 連不上 Supabase？
**A**:
1. 確認 Supabase 本地服務已啟動：`supabase status`
2. 檢查連接字串格式是否正確
3. 確認防火牆沒有阻擋 5432 或 54322 port

### Q: Context7 查不到某些技術文檔？
**A**: Context7 支援主流技術棧，若查不到可能該專案未被收錄，可改用 Brave Search。

### Q: Skills 和 MCP Servers 有什麼區別？
**A**:
- **Skills/Plugins**：Claude Code 內建的開發能力模組（如 TDD、安全審查、前端設計等）
- **MCP Servers**：外部工具整合（如資料庫、搜尋引擎、瀏覽器自動化等）

### Q: 如何知道哪個 Skill 適合我的任務？
**A**: 參考以下對照表：

| 任務類型 | 推薦 Skill/Plugin | 調用方式 |
|:---------|:------------------|:---------|
| 新功能開發 | feature-dev | `/feature-dev` |
| 前端組件設計 | frontend-design | `/frontend-design` |
| 測試驅動開發 | tdd-workflow | 直接請求 |
| 安全性審查 | security-review | `/security-review` 或直接請求 |
| Git commit | commit-commands | `/commit` |
| 程式碼審查 | coding-standards | 直接請求 |
| API 設計 | backend-patterns | 直接請求 |

### Q: 為什麼我請求使用某個 Skill 但 AI 沒有調用？
**A**: 根據專案的 `CLAUDE.md` 設定，AI 不會主動使用系統 Skills。您需要：
1. 明確要求使用特定 Skill（例如：「請用 TDD workflow」）
2. 使用斜槓命令（例如：`/frontend-design`）
3. 確認該 Skill 已安裝（查看 `~/.claude/plugins/installed_plugins.json`）

---

## 📚 參考資源

### MCP Servers
- [MCP 官方文檔](https://modelcontextprotocol.io/)
- [Context7 使用說明](https://github.com/upatra/mcp-context7)
- [Brave Search API](https://brave.com/search/api/)
- [Supabase CLI 文檔](https://supabase.com/docs/guides/cli)

### Skills/Plugins
- [Claude Code 官方文檔](https://docs.anthropic.com/claude-code)
- [Playwright 測試文檔](https://playwright.dev/)
- [TDD 最佳實踐](https://testdriven.io/)

### 專案規範
- [通用開發規則](./.claude/rules/general.md)
- [前端規則](./.claude/rules/frontend/react-expo.md)
- [後端規則](./.claude/rules/backend/supabase.md)
- [統一設計規範](./design-guidelines/UNIFIED_DESIGN_STANDARD.md)

---

## 🔄 更新記錄

| 版本 | 日期 | 修改者 | 變更內容 |
|:-----|:-----|:-------|:---------|
| 2.0 | 2026-02-13 | Claude Opus 4.6 | 整合 Skills/Plugins 章節，重命名為整合指南 |
| 1.0 | 2026-01-30 | Project Team | 初始版本（MCP Server 設置指南） |
