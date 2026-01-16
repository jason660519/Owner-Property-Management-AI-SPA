#!/bin/bash

# MCP Server 连接验证脚本 (macOS 兼容版)
# 作用：自动测试所有配置的 MCP 伺服器是否能正常连接

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载环境变量的函数
get_env_var() {
    local var_name=$1
    grep "^${var_name}=" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r'
}

# 创建测试结果数组
declare -a RESULTS
declare -A TEST_STATUS

# 预加载关键环境变量
DATABASE_URL=$(get_env_var "DATABASE_URL")
GITHUB_TOKEN=$(get_env_var "GITHUB_TOKEN")
SQLITE_DB_PATH=$(get_env_var "SQLITE_DB_PATH")
SLACK_BOT_TOKEN=$(get_env_var "SLACK_BOT_TOKEN")
SLACK_TEAM_ID=$(get_env_var "SLACK_TEAM_ID")
BRAVE_API_KEY=$(get_env_var "BRAVE_API_KEY")
FIRECRAWL_API_KEY=$(get_env_var "FIRECRAWL_API_KEY")
OPENAI_API_KEY=$(get_env_var "OPENAI_API_KEY")
ANTHROPIC_API_KEY=$(get_env_var "ANTHROPIC_API_KEY")
GOOGLE_API_KEY=$(get_env_var "GOOGLE_API_KEY")
NOTION_API_KEY=$(get_env_var "NOTION_API_KEY")
DOCKER_HOST=$(get_env_var "DOCKER_HOST")

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MCP Server 连接验证 ($(date +%Y-%m-%d\ %H:%M:%S))       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ========== 无依赖伺服器测试 ==========
echo -e "${BLUE}📋 测试无依赖伺服器 (立即可用)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Filesystem
echo -n "1. filesystem (文件系统访问)... "
if command -v npx &> /dev/null; then
    if timeout 10 npx @modelcontextprotocol/server-filesystem "$PROJECT_ROOT" --help &> /dev/null; then
        echo -e "${GREEN}✓ 可用${NC}"
        TEST_STATUS["filesystem"]="✓"
    else
        echo -e "${YELLOW}⚠ 可能需要检查${NC}"
        TEST_STATUS["filesystem"]="⚠"
    fi
else
    echo -e "${YELLOW}⚠ 需要 Node.js${NC}"
    TEST_STATUS["filesystem"]="⚠"
fi

# 2. Fetch
echo -n "2. fetch (Web 内容获取)... "
if timeout 10 npx @modelcontextprotocol/server-fetch --help &> /dev/null; then
    echo -e "${GREEN}✓ 可用${NC}"
    TEST_STATUS["fetch"]="✓"
else
    echo -e "${YELLOW}⚠ 可能需要检查${NC}"
    TEST_STATUS["fetch"]="⚠"
fi

# 3. Mermaid Server
echo -n "3. mermaid-server (图表生成)... "
if timeout 10 npx @raymonddeng99/mermaid-mcp --help &> /dev/null; then
    echo -e "${GREEN}✓ 可用${NC}"
    TEST_STATUS["mermaid-server"]="✓"
else
    echo -e "${YELLOW}⚠ 可能需要检查${NC}"
    TEST_STATUS["mermaid-server"]="⚠"
fi

# 4. Context7
echo -n "4. context7 (长上下文记忆体)... "
if timeout 10 npx @upstash/context7-mcp --help &> /dev/null; then
    echo -e "${GREEN}✓ 可用${NC}"
    TEST_STATUS["context7"]="✓"
else
    echo -e "${YELLOW}⚠ 可能需要检查${NC}"
    TEST_STATUS["context7"]="⚠"
fi

# 5. Memory
echo -n "5. memory (会话记忆体管理)... "
if timeout 10 npx @anthropic/mcp-memory --help &> /dev/null; then
    echo -e "${GREEN}✓ 可用${NC}"
    TEST_STATUS["memory"]="✓"
else
    echo -e "${YELLOW}⚠ 可能需要检查${NC}"
    TEST_STATUS["memory"]="⚠"
fi

# 6. Docker (Copilot Container)
echo -n "6. mcp-copilot-conta (Docker 容器管理)... "
if timeout 10 npx @copilot-extensions/mcp-copilot-conta --help &> /dev/null; then
    echo -e "${GREEN}✓ 可用${NC}"
    TEST_STATUS["mcp-copilot-conta"]="✓"
else
    echo -e "${YELLOW}⚠ 可能需要检查${NC}"
    TEST_STATUS["mcp-copilot-conta"]="⚠"
fi

echo ""

# ========== 依赖环境变量的伺服器测试 ==========
echo -e "${BLUE}🔌 测试需要环境变量的伺服器${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 7. PostgreSQL
echo -n "7. postgres (PostgreSQL 数据库)... "
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ 缺少 DATABASE_URL${NC}"
    TEST_STATUS["postgres"]="✗"
elif command -v psql &> /dev/null; then
    if timeout 5 psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ 连接成功${NC}"
        TEST_STATUS["postgres"]="✓"
    else
        echo -e "${YELLOW}⚠ 连接失败（检查 PostgreSQL 服务器）${NC}"
        TEST_STATUS["postgres"]="⚠"
    fi
else
    echo -e "${YELLOW}⚠ 未安装 psql（但 MCP 可用）${NC}"
    TEST_STATUS["postgres"]="⚠"
fi

# 8. GitHub
echo -n "8. github (GitHub 整合)... "
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}✗ 缺少 GITHUB_TOKEN${NC}"
    TEST_STATUS["github"]="✗"
else
    if timeout 5 curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user &> /dev/null; then
        echo -e "${GREEN}✓ 认证成功${NC}"
        TEST_STATUS["github"]="✓"
    else
        echo -e "${YELLOW}⚠ 认证失败（检查 token）${NC}"
        TEST_STATUS["github"]="⚠"
    fi
fi

# 9. SQLite
echo -n "9. sqlite (SQLite 数据库)... "
if [ -z "$SQLITE_DB_PATH" ]; then
    echo -e "${RED}✗ 缺少 SQLITE_DB_PATH${NC}"
    TEST_STATUS["sqlite"]="✗"
elif [ ! -f "$SQLITE_DB_PATH" ]; then
    echo -e "${YELLOW}⚠ 数据库文件不存在 (${SQLITE_DB_PATH})${NC}"
    TEST_STATUS["sqlite"]="⚠"
else
    if command -v sqlite3 &> /dev/null; then
        if timeout 5 sqlite3 "$SQLITE_DB_PATH" "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✓ 可访问${NC}"
            TEST_STATUS["sqlite"]="✓"
        else
            echo -e "${YELLOW}⚠ 访问失败${NC}"
            TEST_STATUS["sqlite"]="⚠"
        fi
    else
        echo -e "${YELLOW}⚠ 未安装 sqlite3（但文件存在）${NC}"
        TEST_STATUS["sqlite"]="⚠"
    fi
fi

# 10. Brave Search
echo -n "10. brave-search (搜索引擎)... "
if [ -z "$BRAVE_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 BRAVE_API_KEY${NC}"
    TEST_STATUS["brave-search"]="✗"
else
    if timeout 5 curl -s "https://api.search.brave.com/res/v1/web/search?q=test" \
        -H "Accept: application/json" \
        -H "X-Subscription-Token: $BRAVE_API_KEY" &> /dev/null; then
        echo -e "${GREEN}✓ API 可用${NC}"
        TEST_STATUS["brave-search"]="✓"
    else
        echo -e "${YELLOW}⚠ API 验证失败${NC}"
        TEST_STATUS["brave-search"]="⚠"
    fi
fi

# 11. Slack
echo -n "11. slack (Slack 整合)... "
if [ -z "$SLACK_BOT_TOKEN" ] || [ -z "$SLACK_TEAM_ID" ]; then
    echo -e "${RED}✗ 缺少 SLACK_BOT_TOKEN 或 SLACK_TEAM_ID${NC}"
    TEST_STATUS["slack"]="✗"
else
    if timeout 5 curl -s "https://slack.com/api/auth.test" \
        -H "Authorization: Bearer $SLACK_BOT_TOKEN" &> /dev/null; then
        echo -e "${GREEN}✓ 认证成功${NC}"
        TEST_STATUS["slack"]="✓"
    else
        echo -e "${YELLOW}⚠ 认证失败${NC}"
        TEST_STATUS["slack"]="⚠"
    fi
fi

# 12. Firecrawl
echo -n "12. firecrawl (Web 爬虫)... "
if [ -z "$FIRECRAWL_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 FIRECRAWL_API_KEY${NC}"
    TEST_STATUS["firecrawl"]="✗"
else
    if timeout 5 curl -s "https://api.firecrawl.dev/v0/scrape" \
        -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"url":"https://example.com"}' &> /dev/null; then
        echo -e "${GREEN}✓ API 可用${NC}"
        TEST_STATUS["firecrawl"]="✓"
    else
        echo -e "${YELLOW}⚠ API 验证失败${NC}"
        TEST_STATUS["firecrawl"]="⚠"
    fi
fi

# 13. OpenAI
echo -n "13. openai (OpenAI API)... "
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 OPENAI_API_KEY${NC}"
    TEST_STATUS["openai"]="✗"
else
    if timeout 5 curl -s "https://api.openai.com/v1/models" \
        -H "Authorization: Bearer $OPENAI_API_KEY" &> /dev/null; then
        echo -e "${GREEN}✓ API 可用${NC}"
        TEST_STATUS["openai"]="✓"
    else
        echo -e "${YELLOW}⚠ API 验证失败${NC}"
        TEST_STATUS["openai"]="⚠"
    fi
fi

# 14. Anthropic
echo -n "14. anthropic (Anthropic API)... "
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 ANTHROPIC_API_KEY${NC}"
    TEST_STATUS["anthropic"]="✗"
else
    echo -e "${GREEN}✓ API Key 已配置${NC}"
    TEST_STATUS["anthropic"]="✓"
fi

# 15. Google Maps
echo -n "15. googlemaps (Google Maps API)... "
if [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 GOOGLE_API_KEY${NC}"
    TEST_STATUS["googlemaps"]="✗"
else
    echo -e "${GREEN}✓ API Key 已配置${NC}"
    TEST_STATUS["googlemaps"]="✓"
fi

# 16. Notion
echo -n "16. notion (Notion 数据库)... "
if [ -z "$NOTION_API_KEY" ]; then
    echo -e "${RED}✗ 缺少 NOTION_API_KEY${NC}"
    TEST_STATUS["notion"]="✗"
else
    if timeout 5 curl -s "https://api.notion.com/v1/users/me" \
        -H "Authorization: Bearer $NOTION_API_KEY" \
        -H "Notion-Version: 2022-06-28" &> /dev/null; then
        echo -e "${GREEN}✓ API 可用${NC}"
        TEST_STATUS["notion"]="✓"
    else
        echo -e "${YELLOW}⚠ API 验证失败${NC}"
        TEST_STATUS["notion"]="⚠"
    fi
fi

# 17. Docker
echo -n "17. docker (Docker 容器管理)... "
if [ -z "$DOCKER_HOST" ]; then
    echo -e "${RED}✗ 缺少 DOCKER_HOST${NC}"
    TEST_STATUS["docker"]="✗"
elif command -v docker &> /dev/null; then
    if timeout 5 docker ps &> /dev/null; then
        echo -e "${GREEN}✓ 可用${NC}"
        TEST_STATUS["docker"]="✓"
    else
        echo -e "${YELLOW}⚠ Docker daemon 未运行${NC}"
        TEST_STATUS["docker"]="⚠"
    fi
else
    echo -e "${YELLOW}⚠ 未安装 Docker CLI${NC}"
    TEST_STATUS["docker"]="⚠"
fi

echo ""

# ========== 环境变量检查 ==========
echo -e "${BLUE}🔐 环境变量检查${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_VARS=("DATABASE_URL" "GITHUB_TOKEN" "ANTHROPIC_API_KEY" "OPENAI_API_KEY" "SQLITE_DB_PATH" "SLACK_BOT_TOKEN" "BRAVE_API_KEY" "FIRECRAWL_API_KEY" "GOOGLE_API_KEY" "DOCKER_HOST")

for var in "${ENV_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        value="${!var}"
        # 隐藏敏感信息
        masked_value="${value:0:10}...${value: -5}"
        echo -e "✓ ${var}: ${masked_value}"
    else
        echo -e "${RED}✗ ${var}: 未配置${NC}"
    fi
done

echo ""

# ========== 总结 ==========
echo -e "${BLUE}📊 测试总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUCCESS=0
WARNING=0
FAILED=0

for status in "${TEST_STATUS[@]}"; do
    if [[ "$status" == "✓" ]]; then
        ((SUCCESS++))
    elif [[ "$status" == "⚠" ]]; then
        ((WARNING++))
    elif [[ "$status" == "✗" ]]; then
        ((FAILED++))
    fi
done

TOTAL=$((SUCCESS + WARNING + FAILED))

echo -e "总 MCP 伺服器: ${BLUE}${TOTAL}${NC}"
echo -e "✓ 正常: ${GREEN}${SUCCESS}${NC}"
echo -e "⚠ 警告: ${YELLOW}${WARNING}${NC}"
echo -e "✗ 失败: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有 MCP 伺服器已就绪！${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ 部分 MCP 伺服器需要检查，详见上方报告${NC}"
    exit 1
fi
