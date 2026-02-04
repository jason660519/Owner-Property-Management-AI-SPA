#!/bin/bash

# filepath: start-vlm-test.sh
# description: 快速啟動 VLM 測試環境腳本
# created: 2026-02-04
# creator: Claude Sonnet 4.5

set -e

echo "🚀 啟動 VLM 文件掃描測試環境..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定 Master Key
export VLM_MASTER_KEY=227bcc677f65be6034e92de0e77aef69c1b105537c15938edc892d24f83e9025

# 取得 Supabase 連線資訊
echo -e "${BLUE}📊 檢查 Supabase 狀態...${NC}"
supabase status > /dev/null 2>&1 || { echo "❌ Supabase 未啟動，請執行: supabase start"; exit 1; }

SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
export SUPABASE_URL=${SUPABASE_URL:-"http://127.0.0.1:54321"}

echo -e "${GREEN}✅ Supabase 運行中: $SUPABASE_URL${NC}"
echo ""

# 檢查後端虛擬環境
if [ ! -d "backend/ocr_service/venv" ]; then
    echo -e "${YELLOW}⚠️  虛擬環境不存在，正在建立...${NC}"
    cd backend/ocr_service
    python3 -m venv venv
    source venv/bin/activate
    pip install cryptography 'python-jose[cryptography]' pydantic fastapi uvicorn supabase --quiet
    cd ../..
    echo -e "${GREEN}✅ 虛擬環境建立完成${NC}"
else
    echo -e "${GREEN}✅ 虛擬環境已存在${NC}"
fi

echo ""
echo -e "${BLUE}🔧 環境變數設定：${NC}"
echo "   VLM_MASTER_KEY: ${VLM_MASTER_KEY:0:20}..."
echo "   SUPABASE_URL: $SUPABASE_URL"
echo ""

# 提示用戶下一步
echo -e "${YELLOW}📝 接下來請執行以下步驟：${NC}"
echo ""
echo "1️⃣  啟動後端服務 (新開終端機):"
echo -e "   ${BLUE}cd backend/ocr_service${NC}"
echo -e "   ${BLUE}source venv/bin/activate${NC}"
echo -e "   ${BLUE}export VLM_MASTER_KEY=227bcc677f65be6034e92de0e77aef69c1b105537c15938edc892d24f83e9025${NC}"
echo -e "   ${BLUE}export SUPABASE_URL=http://127.0.0.1:54321${NC}"
echo -e "   ${BLUE}uvicorn src.api.main:app --reload --port 8000${NC}"
echo ""
echo "2️⃣  啟動前端服務 (新開另一個終端機):"
echo -e "   ${BLUE}cd apps/web${NC}"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo "3️⃣  開啟瀏覽器測試:"
echo -e "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${GREEN}✨ 準備完成！${NC}"
