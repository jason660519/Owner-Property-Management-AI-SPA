#!/bin/bash

# 停止所有開發服務
# 創建時間: 2026-02-05
# 用途: 一鍵停止所有開發環境服務

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🛑 停止所有開發服務${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 停止 Web App (Port 3000)
echo -e "${YELLOW}1️⃣  停止 Web App (Port 3000)...${NC}"
if lsof -ti :3000 > /dev/null 2>&1; then
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Web App 已停止${NC}"
else
    echo -e "${YELLOW}⚪ Web App 未在運行${NC}"
fi
echo ""

# 停止 Superadmin (Port 3001)
echo -e "${YELLOW}2️⃣  停止 Superadmin (Port 3001)...${NC}"
if lsof -ti :3001 > /dev/null 2>&1; then
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Superadmin 已停止${NC}"
else
    echo -e "${YELLOW}⚪ Superadmin 未在運行${NC}"
fi
echo ""

# 停止開發進度追蹤系統 (Port 3002)
echo -e "${YELLOW}3️⃣  停止開發進度追蹤系統 (Port 3002)...${NC}"
if lsof -ti :3002 > /dev/null 2>&1; then
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
    pkill -f "server.py" 2>/dev/null || true
    echo -e "${GREEN}✅ 開發進度追蹤系統已停止${NC}"
else
    echo -e "${YELLOW}⚪ 開發進度追蹤系統未在運行${NC}"
fi
echo ""

# 停止 OCR 服務 (Port 8000)
echo -e "${YELLOW}4️⃣  停止離線謄本查詢系統 (Port 8000)...${NC}"
if lsof -ti :8000 > /dev/null 2>&1; then
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    pkill -f "python minimal_app.py" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    echo -e "${GREEN}✅ OCR 服務已停止${NC}"
else
    echo -e "${YELLOW}⚪ OCR 服務未在運行${NC}"
fi
echo ""

# 停止 Supabase (可選)
read -p "是否停止 Supabase？(y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}5️⃣  停止 Supabase...${NC}"
    supabase stop
    echo -e "${GREEN}✅ Supabase 已停止${NC}"
else
    echo -e "${YELLOW}⚪ Supabase 保持運行${NC}"
fi
echo ""

# 清理臨時日誌
echo -e "${YELLOW}6️⃣  清理臨時日誌...${NC}"
rm -f /tmp/nextjs.log /tmp/superadmin.log /tmp/ocr_service.log 2>/dev/null || true
echo -e "${GREEN}✅ 日誌已清理${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 所有服務已停止${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
