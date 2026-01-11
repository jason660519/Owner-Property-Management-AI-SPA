# MCP 環境變數設定指南

## 概述
本專案的 MCP 服務器配置已改為從專案根目錄的 `.env` 檔案讀取環境變數。所有敏感資訊和配置都統一管理在 `.env` 檔案中。

## 配置架構

`.mcp.json` 已配置為使用 shell wrapper 自動載入 `.env` 檔案：
```bash
sh -c "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-..."
```

這意味著：
- ✅ 無需手動設定系統環境變數
- ✅ 所有配置集中在 `.env` 檔案
- ✅ 啟動時自動載入環境變數
- ✅ 不同專案可以有獨立的配置

## 必要環境變數

在專案根目錄的 `.env` 檔案中，確保包含以下變數：

### 1. PostgreSQL 資料庫
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/realestate_saas
```
- **說明**: PostgreSQL 資料庫連接字串
- **格式**: `postgresql://[使用者]:[密碼]@[主機]:[端口]/[資料庫名稱]`
- **用途**: 物業資料、使用者管理、財務記錄

### 2. GitHub 整合
```bash
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=jason66
GITHUB_REPO=owner-real-estate-agent-saas
```
- **GITHUB_TOKEN**: GitHub Personal Access Token
  - 需要權限: `repo`, `read:org`, `read:user`
  - 取得方式: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- **GITHUB_OWNER**: GitHub 帳號名稱
- **GITHUB_REPO**: Repository 名稱

### 3. SQLite 資料庫
```bash
SQLITE_DB_PATH=/Users/jason66/Owner Real Estate Agent SaaS/dev/local.db
```
- **說明**: SQLite 資料庫檔案路徑
- **用途**: 本地開發和測試

### 4. Brave Search API
```bash
BRAVE_API_KEY=your_brave_api_key_here
```
- **說明**: Brave Search API 金鑰
- **用途**: 市場研究和競爭分析
- **取得方式**: https://brave.com/search/api/

## 設定步驟

### 1. 檢查 `.env` 檔案

確認專案根目錄已有 `.env` 檔案，並包含上述所有變數：

```bash
# 檢查檔案是否存在
ls -la /Users/jason66/Owner\ Real\ Estate\ Agent\ SaaS/.env

# 查看內容（確保不外洩敏感資訊）
cat .env | grep -E "(DATABASE_URL|GITHUB_TOKEN|GITHUB_OWNER|GITHUB_REPO|SQLITE_DB_PATH|BRAVE_API_KEY)"
```

### 2. 更新實際值

編輯 `.env` 檔案，填入實際的 API keys 和配置：

```bash
nano .env
```

確保以下變數有正確的值（非範例值）：
- `DATABASE_URL`: 實際的 PostgreSQL 連接字串
- `GITHUB_TOKEN`: 有效的 GitHub token
- `BRAVE_API_KEY`: 實際的 Brave Search API key（如果使用）

### 3. 重啟 Claude Code

修改 `.env` 後，重新啟動 Claude Code 讓新配置生效。

## 驗證設定

### 測試環境變數載入

```bash
# 進入專案目錄
cd "/Users/jason66/Owner Real Estate Agent SaaS"

# 測試載入 .env
set -a && [ -f '.env' ] && . '.env' && set +a

# 驗證變數已載入
echo $DATABASE_URL
echo $GITHUB_TOKEN
echo $GITHUB_OWNER
```

### 測試 MCP 服務器連接

1. 啟動 Claude Code
2. 檢查 MCP 服務器狀態
3. 如果連接失敗，查看錯誤訊息

## 安全性建議

### ⚠️ 重要：保護 `.env` 檔案

1. **已加入 `.gitignore`**: 確認 `.env` 已在 `.gitignore` 中（✅ 已設定）
2. **不要提交到版本控制**: 絕不將 `.env` commit 到 Git
3. **使用 `.env.example`**: 提供範本檔案給其他開發者
4. **定期更新 Token**: 建議每 3-6 個月更新 API keys
5. **最小權限原則**: 只授予必要的權限
6. **備份敏感資訊**: 使用密碼管理器安全儲存

### 檢查 `.gitignore`

```bash
# 確認 .env 已被忽略
cat .gitignore | grep "\.env"

# 檢查 .env 是否會被 commit（應該顯示被忽略）
git status --ignored | grep ".env"
```

## MCP 服務器配置說明

### PostgreSQL Server
```json
{
  "command": "sh",
  "args": ["-c", "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-postgres \"$DATABASE_URL\""]
}
```
- 從 `.env` 讀取 `DATABASE_URL`
- 自動連接到指定的 PostgreSQL 資料庫

### GitHub Server
```json
{
  "command": "sh",
  "args": ["-c", "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-github --owner \"$GITHUB_OWNER\" --repo \"$GITHUB_REPO\""],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN" }
}
```
- 從 `.env` 讀取 `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- 連接到指定的 GitHub repository

### SQLite Server
```json
{
  "command": "sh",
  "args": ["-c", "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-sqlite --db-path \"$SQLITE_DB_PATH\""]
}
```
- 從 `.env` 讀取 `SQLITE_DB_PATH`
- 連接到指定的 SQLite 資料庫檔案

### Brave Search Server
```json
{
  "command": "sh",
  "args": ["-c", "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-brave-search"]
}
```
- 從 `.env` 讀取 `BRAVE_API_KEY`
- 提供網頁搜尋功能

## 故障排除

### MCP 服務器無法啟動

**檢查項目:**
1. `.env` 檔案是否存在於專案根目錄
2. `.env` 檔案權限是否正確 (`chmod 600 .env`)
3. 環境變數值是否正確（沒有多餘的空格或引號）
4. 相關服務是否正在運行（PostgreSQL、SQLite 檔案路徑是否存在）

**除錯命令:**
```bash
# 檢查 .env 檔案格式
cat .env | grep -v "^#" | grep -v "^$"

# 測試手動載入
set -a && source .env && set +a && env | grep -E "(DATABASE|GITHUB|SQLITE|BRAVE)"

# 測試 PostgreSQL 連接
psql "$DATABASE_URL" -c "SELECT version();"

# 測試 SQLite 檔案
ls -la "$SQLITE_DB_PATH"
```

### GitHub MCP 連接失敗

**可能原因:**
1. Token 已過期或無效
2. Token 權限不足
3. Repository 名稱錯誤
4. 網路連接問題

**解決方案:**
```bash
# 驗證 GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# 檢查 repository 存取權限
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO
```

### PostgreSQL 連接失敗

**檢查項目:**
1. PostgreSQL 服務是否運行
2. 資料庫是否存在
3. 使用者名稱和密碼是否正確
4. 連接字串格式是否正確

**除錯命令:**
```bash
# 檢查 PostgreSQL 狀態
pg_isready

# 測試連接
psql "$DATABASE_URL" -c "\l"

# 檢查資料庫是否存在
psql "$DATABASE_URL" -c "SELECT current_database();"
```

## 更新日誌

- **2026-01-12**: 改為從專案 `.env` 檔案讀取配置
  - 使用 shell wrapper 自動載入環境變數
  - 移除系統環境變數依賴
  - 所有配置集中管理
- **2026-01-12**: 初始版本，環境變數引用架構
