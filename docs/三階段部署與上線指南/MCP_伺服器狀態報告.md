# MCP 伺服器狀態報告

> 檢測日期：2026-01-13  
> 配置位置：`.claude/.mcp.json` 和 `.mcp.json`

---

## 📊 MCP 伺服器總覽

### 配置的 MCP 伺服器

根據專案配置檔案，以下 MCP 伺服器已配置：

---

## ✅ 專案特定配置 (`.claude/.mcp.json`)

### 1. **mcp-copilot-conta** 🐳

- **狀態**: ✅ 已配置
- **類型**: Docker 容器管理
- **描述**: Docker container management for development environment and deployment
- **配置**:
  - Command: `npx @copilot-extensions/mcp-copilot-conta`
  - Mount: `/Users/jason66/Owner Real Estate Agent SaaS`
- **用途**: 開發環境和部署的容器管理

### 2. **mermaid-server** 📊

- **狀態**: ✅ 已配置
- **類型**: 圖表生成
- **描述**: Mermaid diagram creation and validation for system architecture documentation
- **配置**: `npx @raymonddeng99/mermaid-mcp`
- **用途**: 系統架構文檔的圖表創建和驗證

### 3. **filesystem** 📁

- **狀態**: ✅ 已配置
- **類型**: 檔案系統訪問
- **描述**: File system access for project management and code editing
- **配置**: `npx @modelcontextprotocol/server-filesystem`
  - Path: `/Users/jason66/Owner Real Estate Agent SaaS`
- **用途**: 專案管理和代碼編輯的檔案系統訪問

### 4. **fetch** 🌐

- **狀態**: ✅ 已配置
- **類型**: Web 內容獲取
- **描述**: Web content fetching for documentation research and third-party service integration
- **配置**: `npx @modelcontextprotocol/server-fetch`
- **用途**: 文檔研究和第三方服務整合的 Web 內容獲取

### 5. **postgres** 🐘

- **狀態**: ⚠️ 需環境變數
- **類型**: PostgreSQL 資料庫
- **描述**: PostgreSQL database management for property data, user management, and financial records
- **配置**:
  - 從 `.env` 讀取 `DATABASE_URL`
  - Command: `npx @modelcontextprotocol/server-postgres`
- **環境變數需求**: `DATABASE_URL`
- **用途**: 物業資料、使用者管理、財務記錄的資料庫管理
- **狀態**: ✅ `.env` 檔案存在

### 6. **github** 🐙

- **狀態**: ⚠️ 需環境變數
- **類型**: GitHub 整合
- **描述**: GitHub repository management for version control and collaboration
- **配置**:
  - 從 `.env` 讀取 `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
  - Command: `npx @modelcontextprotocol/server-github`
- **環境變數需求**:
  - `GITHUB_TOKEN` (Personal Access Token)
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
- **用途**: 版本控制和協作的 GitHub 倉庫管理

### 7. **sqlite** 💾

- **狀態**: ⚠️ 需環境變數
- **類型**: SQLite 資料庫
- **描述**: SQLite database for local development and testing
- **配置**:
  - 從 `.env` 讀取 `SQLITE_DB_PATH`
  - Command: `npx @modelcontextprotocol/server-sqlite`
- **環境變數需求**: `SQLITE_DB_PATH`
- **用途**: 本地開發和測試的 SQLite 資料庫

### 8. **brave-search** 🔍

- **狀態**: ⚠️ 需環境變數
- **類型**: 搜尋引擎
- **描述**: Market research for competitive analysis and real estate trend data
- **配置**:
  - 從 `.env` 讀取 `BRAVE_API_KEY`
  - Command: `npx @modelcontextprotocol/server-brave-search`
- **環境變數需求**: `BRAVE_API_KEY`
- **用途**: 市場研究和競爭分析、房地產趨勢資料

---

## 📋 全域配置 (`.mcp.json`)

### 9. **github** (Anthropic)

- **狀態**: ⚠️ 需環境變數
- **類型**: GitHub 整合 (Anthropic 版本)
- **配置**: `npx -y @anthropic/mcp-github`
- **環境變數需求**: `GITHUB_TOKEN`

### 10. **postgres** (Anthropic)

- **狀態**: ⚠️ 需環境變數
- **類型**: PostgreSQL (Anthropic 版本)
- **配置**: `npx -y @anthropic/mcp-postgres`
- **環境變數需求**: `DATABASE_URL`

### 11. **slack** 💬

- **狀態**: ⚠️ 需環境變數
- **類型**: Slack 整合
- **配置**: `npx -y @anthropic/mcp-slack`
- **環境變數需求**:
  - `SLACK_BOT_TOKEN`
  - `SLACK_TEAM_ID`

### 12. **notion** 📝

- **狀態**: ⚠️ 需環境變數
- **類型**: Notion 整合
- **配置**: `npx -y @anthropic/mcp-notion`
- **環境變數需求**: `NOTION_API_KEY`

### 13. **openai** 🤖

- **狀態**: ⚠️ 需環境變數
- **類型**: OpenAI API
- **配置**: `npx -y @anthropic/mcp-openai`
- **環境變數需求**: `OPENAI_API_KEY`

### 14. **anthropic** 🧠

- **狀態**: ⚠️ 需環境變數
- **類型**: Anthropic API
- **配置**: `npx -y @anthropic/mcp-anthropic`
- **環境變數需求**: `ANTHROPIC_API_KEY`

### 15. **googlemaps** 🗺️

- **狀態**: ⚠️ 需環境變數
- **類型**: Google Maps API
- **配置**: `npx -y @anthropic/mcp-googlemaps`
- **環境變數需求**: `GOOGLE_API_KEY`

### 16. **memory** 🧠

- **狀態**: ✅ 無需環境變數
- **類型**: 記憶體管理
- **配置**: `npx -y @anthropic/mcp-memory`
- **用途**: 記憶體和上下文管理

### 17. **docker** 🐳

- **狀態**: ⚠️ 需環境變數（可選）
- **類型**: Docker 管理
- **配置**: `npx -y @anthropic/mcp-docker`
- **環境變數需求**: `DOCKER_HOST` (可選)

### 18. **firecrawl** 🕷️

- **狀態**: ⚠️ 需環境變數
- **類型**: Web 爬蟲
- **配置**: `npx -y @anthropic/mcp-firecrawl`
- **環境變數需求**: `FIRECRAWL_API_KEY`

### 19. **gdrive** 📁

- **狀態**: ⚠️ 需環境變數
- **類型**: Google Drive 整合
- **配置**: `npx -y @anthropic/mcp-gdrive`
- **環境變數需求**: `GDRIVE_OAUTH_PATH`

---

## 🔍 當前可用狀態

### ✅ 立即可用（無需環境變數）

1. ✅ **mcp-copilot-conta** - Docker 容器管理
2. ✅ **mermaid-server** - 圖表生成
3. ✅ **filesystem** - 檔案系統訪問
4. ✅ **fetch** - Web 內容獲取
5. ✅ **memory** - 記憶體管理

### ⚠️ 需環境變數配置（`.env` 檔案存在）

以下伺服器已配置，但需要確認環境變數是否正確設置：

1. ⚠️ **postgres** - 需要 `DATABASE_URL`
2. ⚠️ **github** - 需要 `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
3. ⚠️ **sqlite** - 需要 `SQLITE_DB_PATH`
4. ⚠️ **brave-search** - 需要 `BRAVE_API_KEY`

### ⚠️ 需環境變數配置（可能未設置）

以下伺服器需要額外的環境變數：

1. ⚠️ **slack** - 需要 `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`
2. ⚠️ **notion** - 需要 `NOTION_API_KEY`
3. ⚠️ **openai** - 需要 `OPENAI_API_KEY`
4. ⚠️ **anthropic** - 需要 `ANTHROPIC_API_KEY`
5. ⚠️ **googlemaps** - 需要 `GOOGLE_API_KEY`
6. ⚠️ **firecrawl** - 需要 `FIRECRAWL_API_KEY`
7. ⚠️ **gdrive** - 需要 `GDRIVE_OAUTH_PATH`

---

## 📝 環境變數檢查清單

### 已確認存在

- ✅ `.env` 檔案存在於專案根目錄

### 建議檢查的環境變數

在 `.env` 檔案中，建議包含以下變數：

```bash
# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/realestate_saas
SQLITE_DB_PATH=/Users/jason66/Owner Real Estate Agent SaaS/dev/local.db

# GitHub
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=jason66
GITHUB_REPO=owner-real-estate-agent-saas

# 搜尋和 API
BRAVE_API_KEY=your_brave_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# 其他服務
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_TEAM_ID=your_slack_team_id
NOTION_API_KEY=your_notion_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
GDRIVE_OAUTH_PATH=/path/to/gdrive_oauth.json
DOCKER_HOST=unix:///var/run/docker.sock
```

---

## 🎯 推薦使用的 MCP 伺服器

### 核心開發工具

1. ✅ **filesystem** - 檔案系統操作
2. ✅ **fetch** - Web 內容獲取
3. ✅ **mermaid-server** - 架構圖表生成

### 資料庫管理

4. ⚠️ **postgres** - 主要資料庫（需配置 `DATABASE_URL`）
5. ⚠️ **sqlite** - 本地測試（需配置 `SQLITE_DB_PATH`）

### 版本控制

6. ⚠️ **github** - Git 倉庫管理（需配置 `GITHUB_TOKEN`）

### 容器管理

7. ✅ **mcp-copilot-conta** - Docker 容器管理

### 市場研究

8. ⚠️ **brave-search** - 搜尋和市場研究（需配置 `BRAVE_API_KEY`）

---

## 🔧 故障排除

### 檢查環境變數

```bash
cd "/Users/jason66/Owner Real Estate Agent SaaS"
set -a && [ -f '.env' ] && . '.env' && set +a
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:0:10}..."
```

### 測試 MCP 伺服器連接

1. 確認 `.env` 檔案存在且包含必要的環境變數
2. 重啟 Claude Code 以載入新的環境變數
3. 檢查 MCP 伺服器日誌（如有錯誤）

---

## 📚 相關文檔

- [MCP 環境變數設定指南](.claude/MCP_ENV_SETUP.md)
- [MCP 配置快速啟動指南](.claude/QUICK_START.md)

---

**報告生成時間**：2026-01-13  
**配置檔案位置**：

- `.claude/.mcp.json` (專案特定)
- `.mcp.json` (全域配置)
