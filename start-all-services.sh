#!/bin/bash

# 統一啟動所有開發服務
# 創建時間: 2026-02-05
# 用途: 一鍵啟動所有開發環境服務

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 啟動所有開發服務${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 檢查必要的命令
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ $1 未安裝${NC}"
        return 1
    fi
}

echo -e "${YELLOW}1️⃣  檢查環境依賴...${NC}"
check_command docker || exit 1
check_command node || exit 1
check_command supabase || exit 1
check_command python3 || exit 1
echo -e "${GREEN}✅ 環境依賴檢查完成${NC}"
echo ""

# 啟動 Supabase
echo -e "${YELLOW}2️⃣  檢查 Supabase 服務...${NC}"
if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
    echo -e "${GREEN}✅ Supabase 已在運行${NC}"
else
    echo -e "${BLUE}   正在啟動 Supabase...${NC}"
    supabase start > /dev/null 2>&1
    echo -e "${GREEN}✅ Supabase 啟動成功${NC}"
fi
echo ""

# 啟動 Web App (Port 3000)
echo -e "${YELLOW}3️⃣  啟動 Web App (Port 3000)...${NC}"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web App 已在運行${NC}"
else
    cd "$PROJECT_ROOT/apps/web"
    nohup npm run dev > /tmp/nextjs.log 2>&1 &
    echo -e "${GREEN}✅ Web App 啟動中（背景運行）${NC}"
fi
echo ""

# 啟動開發進度追蹤系統 (Port 3001)
echo -e "${YELLOW}4️⃣  啟動開發進度追蹤系統 (Port 3001)...${NC}"
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 開發進度追蹤系統已在運行${NC}"
else
    cd "$PROJECT_ROOT"
    nohup python3 server.py > /dev/null 2>&1 &
    echo -e "${GREEN}✅ 開發進度追蹤系統啟動成功${NC}"
fi
echo ""

# 啟動離線謄本查詢系統 (Port 8000)
echo -e "${YELLOW}5️⃣  啟動離線謄本查詢系統 (Port 8000)...${NC}"
if lsof -i :8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OCR 服務已在運行${NC}"
else
    cd "$PROJECT_ROOT/backend/ocr_service"
    
    # 檢查虛擬環境
    if [ ! -d "venv" ]; then
        echo -e "${BLUE}   正在創建 Python 虛擬環境...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        pip install -q fastapi uvicorn pydantic
        deactivate
    fi
    
    # 啟動服務
    source venv/bin/activate
    export VLM_MASTER_KEY=227bcc677f65be6034e92de0e77aef69c1b105537c15938edc892d24f83e9025
    export SUPABASE_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}')
    nohup python minimal_app.py > /tmp/ocr_service.log 2>&1 &
    deactivate
    echo -e "${GREEN}✅ OCR 服務啟動成功${NC}"
fi
echo ""

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務完全啟動...${NC}"
sleep 5
echo ""

# 驗證所有服務
echo -e "${YELLOW}6️⃣  驗證服務狀態...${NC}"
SUCCESS=0
TOTAL=3

# 檢查 Port 3000
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Web App (Port 3000)${NC}"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "   ${RED}❌ Web App (Port 3000) - 啟動失敗${NC}"
fi

# 檢查 Port 3001
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ 開發進度追蹤 (Port 3001)${NC}"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "   ${RED}❌ 開發進度追蹤 (Port 3001) - 啟動失敗${NC}"
fi

# 檢查 Port 8000
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ OCR 服務 (Port 8000)${NC}"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "   ${RED}❌ OCR 服務 (Port 8000) - 啟動失敗${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if [ $SUCCESS -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 所有服務已成功啟動！($SUCCESS/$TOTAL)${NC}"
else
    echo -e "${YELLOW}⚠️  部分服務啟動失敗 ($SUCCESS/$TOTAL)${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 顯示服務訪問地址
echo -e "${BLUE}📍 服務存取位址：${NC}"
echo -e "   ${GREEN}• Web App:${NC}           http://localhost:3000"
echo -e "   ${GREEN}• 開發進度追蹤:${NC}      http://localhost:3001"
echo -e "   ${GREEN}• OCR 服務:${NC}          http://localhost:8000"
echo -e "   ${GREEN}• Supabase Studio:${NC}   http://localhost:54323"
echo -e "   ${GREEN}• Mailpit:${NC}           http://localhost:54324"
echo ""

# 顯示日誌位置
echo -e "${BLUE}📝 服務日誌：${NC}"
echo -e "   ${YELLOW}• Web App:${NC}      tail -f /tmp/nextjs.log"
echo -e "   ${YELLOW}• OCR 服務:${NC}     tail -f /tmp/ocr_service.log"
echo ""

# 顯示停止指令
echo -e "${BLUE}🛑 停止服務：${NC}"
echo -e "   ${YELLOW}./stop-all-services.sh${NC}"
echo ""
