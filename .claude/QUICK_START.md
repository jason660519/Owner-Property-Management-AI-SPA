# MCP 配置快速啟動指南

## 當前配置方式

專案已配置為從**專案根目錄的 `.env` 檔案**讀取 MCP 服務器環境變數。

## ✅ 檢查清單

### 1. 確認 `.env` 檔案存在
```bash
ls -la "/Users/jason66/Owner Real Estate Agent SaaS/.env"
```

### 2. 驗證必要的環境變數
在 `.env` 檔案中，確保包含以下變數：

```bash
# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/realestate_saas

# GitHub
GITHUB_TOKEN=ghp_your_actual_token
GITHUB_OWNER=jason66
GITHUB_REPO=owner-real-estate-agent-saas

# SQLite
SQLITE_DB_PATH=/Users/jason66/Owner Real Estate Agent SaaS/dev/local.db

# Brave Search (可選)
BRAVE_API_KEY=your_api_key
```

### 3. 重啟 Claude Code

修改 `.env` 後，重新啟動 Claude Code。

## 🔍 測試連接

### 測試環境變數載入
```bash
cd "/Users/jason66/Owner Real Estate Agent SaaS"
set -a && [ -f '.env' ] && . '.env' && set +a
echo "DATABASE_URL: $DATABASE_URL"
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:0:10}..."  # 只顯示前10個字符
echo "GITHUB_OWNER: $GITHUB_OWNER"
```

### 測試 PostgreSQL 連接
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

### 測試 GitHub Token
```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

## 🛠️ 配置工作原理

`.mcp.json` 使用 shell wrapper 自動載入環境變數：

```json
{
  "command": "sh",
  "args": [
    "-c",
    "set -a && [ -f '.env' ] && . '.env' && set +a && npx @modelcontextprotocol/server-..."
  ]
}
```

**執行流程：**
1. `set -a` - 啟用自動導出環境變數
2. `[ -f '.env' ] && . '.env'` - 如果 `.env` 存在，載入它
3. `set +a` - 停止自動導出
4. `npx @modelcontextprotocol/server-...` - 啟動 MCP 服務器

## 🔒 安全提醒

- ✅ `.env` 已加入 `.gitignore`
- ⚠️ 絕不要將 `.env` 提交到 Git
- 🔑 定期更新 API tokens
- 📋 使用 `.claude/.env.example` 作為範本

## 📚 詳細文檔

查看完整的配置說明和故障排除：
- `.claude/MCP_ENV_SETUP.md` - 完整設定指南
- `.claude/.env.example` - 環境變數範本

## 🆘 快速故障排除

### MCP 服務器無法連接？

1. 檢查 `.env` 檔案存在：`ls -la .env`
2. 檢查環境變數格式：`cat .env | grep -v "^#" | grep -v "^$"`
3. 測試手動載入：`set -a && source .env && set +a`
4. 重啟 Claude Code

### PostgreSQL 連接失敗？

```bash
# 檢查服務
pg_isready

# 測試連接
psql "$DATABASE_URL" -c "\l"
```

### GitHub 連接失敗？

```bash
# 驗證 token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

---

**最後更新**: 2026-01-12
**配置版本**: v2.0 (專案 .env 讀取模式)
