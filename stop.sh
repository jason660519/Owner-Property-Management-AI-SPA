#!/bin/bash

# ==========================================
# Owner Property Management - 統一停止腳本
# ==========================================
# 功能：停止所有相關服務、Port 清理、Log 清理

set -e

# --- 配置 ---
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/dev"
PAPERCLIP_ENV_FILE="$PROJECT_ROOT/docker/paperclip/.env.paperclip"
PAPERCLIP_COMPOSE_FILE="$PROJECT_ROOT/docker/paperclip/docker-compose.paperclip.yml"
ELASTIC_COMPOSE_FILE="$PROJECT_ROOT/backend/elasticsearch/docker-compose.yml"
HERMES_RUNTIME_COMPOSE_FILE="$PROJECT_ROOT/tools/hermes-runtime/docker-compose.yml"
PAPERCLIP_PORT="3187"

if [ -f "$PAPERCLIP_ENV_FILE" ]; then
    PAPERCLIP_PORT_FROM_ENV=$(grep '^PAPERCLIP_PORT=' "$PAPERCLIP_ENV_FILE" | head -n1 | cut -d= -f2-)
    if [ -n "$PAPERCLIP_PORT_FROM_ENV" ]; then
        PAPERCLIP_PORT="$PAPERCLIP_PORT_FROM_ENV"
    fi
fi

# --- 顏色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

kill_port() {
    local PORT=$1
    local NAME=$2
    if lsof -ti :$PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $NAME (Port $PORT)...${NC}"
        lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✅ $NAME stopped${NC}"
    else
        echo -e "${BLUE}⚪ $NAME not running${NC}"
    fi
}

echo -e "${BLUE}🛑 正在停止所有服務...${NC}"

# 1. 停止應用服務
kill_port 3000 "Web App"
kill_port 3002 "Web App AU"
kill_port 3001 "Superadmin"
kill_port 8081 "Expo/Metro"

# 停止 Paperclip Docker 服務
if [ -f "$PAPERCLIP_COMPOSE_FILE" ] && [ -f "$PAPERCLIP_ENV_FILE" ]; then
    echo -e "${YELLOW}Stopping Paperclip (Docker)...${NC}"
    docker compose --env-file "$PAPERCLIP_ENV_FILE" -f "$PAPERCLIP_COMPOSE_FILE" down > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Paperclip stopped${NC}"
elif docker ps -a --format '{{.Names}}' | grep -q '^paperclip-paperclip-1$'; then
    echo -e "${YELLOW}Stopping Paperclip container directly...${NC}"
    docker rm -f paperclip-paperclip-1 > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Paperclip stopped${NC}"
fi
kill_port "$PAPERCLIP_PORT" "Paperclip"

# 停止 Hermes Docker 服務
if [ -f "$HERMES_RUNTIME_COMPOSE_FILE" ]; then
    echo -e "${YELLOW}Stopping Hermes Dashboard (Docker)...${NC}"
    (
        cd "$PROJECT_ROOT/tools/hermes-runtime"
        PROJECT_ROOT="$PROJECT_ROOT" \
        HERMES_HOME_DIR="${HERMES_HOME_DIR:-$HOME/.hermes-opm}" \
        docker compose -f "$HERMES_RUNTIME_COMPOSE_FILE" down
    ) > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Hermes Dashboard stopped${NC}"
elif docker ps -a --format '{{.Names}}' | grep -Eq '^(hermes-opm|hermes-dashboard)$'; then
    echo -e "${YELLOW}Stopping Hermes containers directly...${NC}"
    docker rm -f hermes-opm hermes-dashboard > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Hermes Dashboard stopped${NC}"
fi
kill_port 9119 "Hermes Dashboard"
kill_port 9120 "Hermes Dashboard (Alt Port)"

# 停止 Elasticsearch / Kibana Docker 服務
if [ -f "$ELASTIC_COMPOSE_FILE" ]; then
    echo -e "${YELLOW}Stopping Elasticsearch + Kibana (Docker)...${NC}"
    (
        cd "$PROJECT_ROOT/backend/elasticsearch"
        docker compose -f "$ELASTIC_COMPOSE_FILE" down
    ) > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Elasticsearch + Kibana stopped${NC}"
elif docker ps -a --format '{{.Names}}' | grep -Eq '^(elasticsearch|kibana)$'; then
    echo -e "${YELLOW}Stopping Elasticsearch/Kibana containers directly...${NC}"
    docker rm -f elasticsearch kibana > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ Elasticsearch + Kibana stopped${NC}"
fi
kill_port 9200 "Elasticsearch"
kill_port 5601 "Kibana"

# 2. 清理 Log (可選)
rm -f \
    "$LOG_DIR/nextjs.log" \
    "$LOG_DIR/nextjs-au.log" \
    "$LOG_DIR/superadmin.log" \
    "$LOG_DIR/paperclip.log" \
    "$LOG_DIR/hermes-runtime.log" \
    /tmp/nextjs.log \
    /tmp/nextjs-au.log \
    /tmp/superadmin.log 2>/dev/null

# 2.5 清理 Claude Code background-shell 攔截的 log
# 已知問題：Claude Code 把 run_in_background 子進程的 stdout/stderr 存到
# /private/tmp/claude-{UID}/tasks/，沒有 rotation/自動清理。
# 長時間累積可達數十 GB（GitHub anthropics/claude-code#35164）。
# 詳見 .claude/rules/claude-code-background-shell.md
CLAUDE_TMP_TASKS="/private/tmp/claude-$(id -u)/tasks"
if [ -d "$CLAUDE_TMP_TASKS" ]; then
    CLAUDE_TMP_SIZE=$(du -sh "$CLAUDE_TMP_TASKS" 2>/dev/null | awk '{print $1}')
    echo -e "${YELLOW}🧹 清理 Claude Code background-shell logs ($CLAUDE_TMP_TASKS, 目前 $CLAUDE_TMP_SIZE)...${NC}"
    # 只清 24h 前的檔案，避免砍掉正在執行的 task 輸出
    find "$CLAUDE_TMP_TASKS" -type f -mtime +1 -delete 2>/dev/null || true
    echo -e "${GREEN}✅ Claude Code logs 已清理（保留 24h 內的 active log）${NC}"
fi

# 3. 詢問 Supabase
echo ""
if command -v supabase &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
        read -p "是否也要停止 Supabase (Docker)? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Auto-backup metadata before stopping to protect user data
            echo -e "${BLUE}📦 自動備份資料 metadata（保護照片/文件記錄）...${NC}"
            LOCAL_DEVICE_PATH=""
            if command -v psql &>/dev/null; then
                LOCAL_DEVICE_PATH=$(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -t -A \
                  -c "SELECT value::text FROM system_settings WHERE key='backup_local_device_path';" 2>/dev/null | tr -d '"' || echo "")
            fi
            if bash "$PROJECT_ROOT/scripts/backup-metadata.sh" "auto_stop" "$LOCAL_DEVICE_PATH" 2>/dev/null; then
                echo -e "${GREEN}✅ 備份完成${NC}"
            else
                echo -e "${YELLOW}⚠️  備份失敗（DB 可能未運行），繼續停止服務${NC}"
            fi
            echo -e "${YELLOW}Stopping Supabase...${NC}"
            supabase stop
            echo -e "${GREEN}✅ Supabase stopped${NC}"
        else
            echo -e "${BLUE}⚪ Supabase kept running${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}✨ 所有操作完成${NC}"
