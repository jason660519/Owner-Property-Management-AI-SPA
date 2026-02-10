#!/bin/bash

# ==========================================
# Owner Property Management - 統一停止腳本
# ==========================================
# 功能：停止所有相關服務、Port 清理、Log 清理

set -e

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
kill_port 3001 "Superadmin"
kill_port 3002 "Progress Tracker"
kill_port 8000 "OCR Service"
kill_port 8081 "Expo/Metro"

# 2. 停止 Python 殘留進程
echo -e "${YELLOW}檢查殘留 Python 進程...${NC}"
pkill -f "minimal_app.py" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "python server.py" 2>/dev/null || true

# 3. 清理 Log (可選)
rm -f /tmp/nextjs.log /tmp/superadmin.log /tmp/ocr_service.log 2>/dev/null

# 4. 詢問 Supabase
echo ""
if command -v supabase &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
        read -p "是否也要停止 Supabase (Docker)? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
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
