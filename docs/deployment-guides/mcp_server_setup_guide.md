# MCP Server 設置指南

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-02-01  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 開發指南

---


> 更新日期：2026-02-01
> 版本：2.1

---

## 📋 已安裝的 MCP Servers

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

## 🚀 快速啟動（不需額外配置）

以下 MCP servers 已經可以直接使用：

### 1. Context7（技術文檔查詢）
```bash
# 自動使用，已配置 API Key
# 可以查詢：React, Expo, Supabase, TypeScript, PostgreSQL 等最新文檔
```

### 2. Brave Search（網路搜尋）
```bash
# 自動使用，已配置 API Key
# 可用於搜尋最新技術資訊、房地產市場行情等
```

### 3. PostgreSQL（資料庫操作）
```bash
# 自動使用，已連接本地 Supabase
# 可直接查詢、修改資料庫
```

### 4. Playwright（瀏覽器自動化）
```bash
# 自動使用，無需配置
# 可用於網頁測試、截圖、爬蟲等
```

### 5. Filesystem（檔案操作）
```bash
# 自動使用，已綁定專案根目錄
# 路徑：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA
```

### 6. GitHub（倉庫管理）
```bash
# 自動使用，已配置 Personal Access Token
# 可管理 Issues, PRs, Commits 等
```

### 7. Memory（AI 記憶系統）
```bash
# 自動使用，無需配置
# AI 可記住專案特定知識、慣例和偏好
```

### 8. Time（時間處理）
```bash
# 自動使用，無需配置
# 處理時區轉換、預約時間計算等
```

### 9. Fetch（HTTP 客戶端）
```bash
# 自動使用，無需配置
# 測試 API endpoints、整合第三方服務
```

---

## ⚙️ 需要配置的 MCP Servers

### 1. Slack（訊息通知系統）⚠️ 唯一需要額外配置

**用途**：
- 發送物件預約通知
- 系統錯誤告警
- 房東/房客互動提醒
- 租約到期通知

**步驟**：

#### Step 1: 建立 Slack App
1. 前往 [Slack API](https://api.slack.com/apps)
2. 點擊 "Create New App" → "From scratch"
3. 輸入 App 名稱（如：`Property Management Bot`）
4. 選擇您的 Workspace

#### Step 2: 設定權限
1. 在 "OAuth & Permissions" 頁面
2. 在 "Bot Token Scopes" 添加以下權限：
   - `chat:write` - 發送訊息
   - `channels:read` - 讀取頻道列表
   - `channels:history` - 讀取頻道訊息
   - `users:read` - 讀取用戶資訊

#### Step 3: 安裝到 Workspace
1. 在 "OAuth & Permissions" 點擊 "Install to Workspace"
2. 授權後會獲得 **Bot User OAuth Token**（格式：`xoxb-...`）

#### Step 4: 取得 Team ID
1. 在 "Basic Information" 頁面找到 **Team ID**

#### Step 5: 配置環境變數
在 `.env` 檔案中添加：
```bash
# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_TEAM_ID=T01234567
```

完成後重啟 Claude Code 即可使用！

---

### 2. PostgreSQL/Supabase（資料庫操作）

**步驟**：
1. 取得 Supabase 資料庫連接字串：
   ```bash
   # 本地開發
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

## 🔄 啟用/停用 MCP Server

### 停用某個 MCP Server
編輯 `.claude/.mcp.json`，將 `disabled` 設為 `true`：

```json
"brave-search": {
  "disabled": true  // 停用此 server
}
```

### 完全移除
直接從 `.mcp.json` 刪除對應的配置區塊。

---

## 🧪 測試 MCP Servers

重新啟動 Claude Code 後，可以測試各個 MCP server：

### 測試 Context7（技術文檔）
```
請幫我查詢 React 19 的最新 useActionState hook 使用方式
```

### 測試 Brave Search（網路搜尋）
```
搜尋 2026 年台北市租屋市場趨勢
```

### 測試 PostgreSQL（資料庫）
```
列出資料庫中的所有 tables 和它們的欄位
```

### 測試 Playwright（瀏覽器）
```
開啟 https://supabase.com 並截圖首頁
```

### 測試 GitHub（倉庫管理）
```
查看最近 5 個 commits 的訊息
```

### 測試 Slack（訊息通知）⚠️ 需先配置
```
發送測試訊息到 #general 頻道：「MCP Server 測試成功！」
```

### 測試 Memory（AI 記憶）
```
記住：本專案的主要使用者是房東，他們需要管理出租和出售物件
```
稍後測試：
```
這個專案的主要使用者是誰？
```

### 測試 Time（時間處理）
```
計算從現在起 30 天後是幾月幾日？（用於租約到期提醒）
```

### 測試 Fetch（HTTP 請求）
```
測試本地 Supabase API 是否正常：GET http://127.0.0.1:54321/rest/v1/
```

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

---

## 📚 參考資源

- [MCP 官方文檔](https://modelcontextprotocol.io/)
- [Context7 使用說明](https://github.com/upatra/mcp-context7)
- [Brave Search API](https://brave.com/search/api/)
- [Supabase CLI 文檔](https://supabase.com/docs/guides/cli)
