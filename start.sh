#!/bin/bash

# ==========================================
# Owner Property Management - 統一啟動腳本
# ==========================================
# 功能：整合開發環境啟動、服務管理、依賴檢查
# 用法：./start.sh [all|web|admin|ocr|menu]

set -e

# --- 配置 ---
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp"
ENV_FILE="$PROJECT_ROOT/.env"

# --- 顏色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- 載入環境變數 ---
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    # 如果沒有 .env，提供預設值 (避免指令碼報錯，實際上應引導用戶建立)
    echo -e "${YELLOW}⚠️  警告: 未找到 .env 檔案，將使用預設設定。請確保已建立 .env 檔案以避免 Keys 洩露。${NC}"
fi

# --- 輔助函式 ---
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ 錯誤: 未安裝 $1${NC}"
        return 1
    fi
}

check_dependencies() {
    echo -e "${BLUE}🔍 檢查環境依賴...${NC}"
    check_command docker || exit 1
    check_command node || exit 1
    check_command supabase || exit 1
    check_command python3 || exit 1
}

ensure_supabase_running() {
    echo -e "${BLUE}🐘 檢查 Supabase 狀態...${NC}"
    if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
        echo -e "${GREEN}✅ Supabase 已在運行${NC}"
    else
        echo -e "${YELLOW}🔄 正在啟動 Supabase...${NC}"
        supabase start > /dev/null 2>&1
        echo -e "${GREEN}✅ Supabase 啟動成功${NC}"
    fi
    # 更新 SUPABASE_URL (以防萬一)
    export SUPABASE_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}')
}

check_python_venv() {
    local SERVICE_DIR="$1"
    if [ ! -d "$SERVICE_DIR/venv" ]; then
        echo -e "${YELLOW}🐍 建立 Python 虛擬環境: $SERVICE_DIR${NC}"
        cd "$SERVICE_DIR"
        python3 -m venv venv
        source venv/bin/activate
        pip install -q fastapi uvicorn pydantic cryptography 'python-jose[cryptography]' supabase
        deactivate
        cd "$PROJECT_ROOT"
    fi
}

# --- 啟動函式 ---

start_web() {
    echo -e "${BLUE}🌐 啟動 Web App (Port 3000)...${NC}"
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Web App 已在運行${NC}"
    else
        cd "$PROJECT_ROOT/apps/web"
        # 判斷是否為背景模式
        if [ "$1" == "bg" ]; then
            nohup npm run dev > "$LOG_DIR/nextjs.log" 2>&1 &
            echo -e "${GREEN}✅ Web App (Background) 啟動成功${NC}"
        else
            osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/web' && npm run dev\"" >/dev/null 2>&1 &
            echo -e "${GREEN}✅ Web App (Terminal) 啟動成功${NC}"
        fi
    fi
}

start_admin() {
    echo -e "${BLUE}🔐 啟動 Superadmin (Port 3001)...${NC}"
    if lsof -i :3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Superadmin 已在運行${NC}"
    else
        cd "$PROJECT_ROOT/apps/superadmin"
        if [ "$1" == "bg" ]; then
            nohup npm run dev > "$LOG_DIR/superadmin.log" 2>&1 &
            echo -e "${GREEN}✅ Superadmin (Background) 啟動成功${NC}"
        else
            osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/superadmin' && npm run dev\"" >/dev/null 2>&1 &
            echo -e "${GREEN}✅ Superadmin (Terminal) 啟動成功${NC}"
        fi
    fi
}

start_tracker() {
    echo -e "${BLUE}📊 啟動進度追蹤系統 (Port 3002)...${NC}"
    if lsof -i :3002 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  進度追蹤系統已在運行${NC}"
    else
        cd "$PROJECT_ROOT"
        PORT=3002 nohup python3 server.py > /dev/null 2>&1 &
        echo -e "${GREEN}✅ 進度追蹤系統啟動成功${NC}"
    fi
}

start_ocr() {
    echo -e "${BLUE}👁️  啟動 OCR/VLM 服務 (Port 8000)...${NC}"
    local OCR_DIR="$PROJECT_ROOT/backend/ocr_service"
    
    if lsof -i :8000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  OCR 服務已在運行${NC}"
    else
        check_python_venv "$OCR_DIR"
        
        cd "$OCR_DIR"
        source venv/bin/activate
        
        # 確保必要環境變數存在 (優先使用 .env 中的設定，若無則依賴外部環境或預設)
        if [ -z "$VLM_MASTER_KEY" ]; then
             echo -e "${YELLOW}⚠️  注意: 未偵測到 VLM_MASTER_KEY，請確認 .env 設定${NC}"
        fi
        
        # 啟動
        nohup python minimal_app.py > "$LOG_DIR/ocr_service.log" 2>&1 &
        deactivate
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✅ OCR 服務啟動成功${NC}"
    fi
}

start_all() {
    echo -e "${BLUE}🚀 正在啟動所有服務 (背景模式)...${NC}"
    check_dependencies
    ensure_supabase_running
    start_web "bg"
    start_admin "bg"
    start_tracker
    start_ocr
    
    echo ""
    echo -e "${GREEN}🎉 所有服務啟動程序已完成${NC}"
    echo -e "   • Web App:          http://localhost:3000"
    echo -e "   • Superadmin:       http://localhost:3001/superadmin/dashboard"
    echo -e "   • OCR Service:      http://localhost:8000"
    echo -e "   • Supabase Studio:  http://localhost:54323"
    echo -e "   • Mailpit (Email):  http://localhost:54324"
    echo -e "   • Logs:             $LOG_DIR/"
}

clean_cache() {
    echo -e "${YELLOW}🧹 清除快取...${NC}"
    rm -rf "$PROJECT_ROOT/apps/web/.next"
    rm -rf "$PROJECT_ROOT/apps/superadmin/.next"
    echo -e "${GREEN}✅ 完成${NC}"
}

# --- 選單介面 ---
show_menu() {
    clear
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Owner Property Management - 啟動選單 ${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo "1) 🚀 啟動所有服務 (背景執行)"
    echo "2) 🌐 啟動 Web App (獨立視窗)"
    echo "3) 🔐 啟動 Superadmin (獨立視窗)"
    echo "4) 👁️  啟動 OCR/VLM 後端"
    echo "5) 🧹 清除快取"
    echo "6) 🛑 停止所有服務"
    echo "0) 離開"
    echo ""
    read -p "請輸入選項: " choice
    
    case $choice in
        1) start_all ;;
        2) check_dependencies; ensure_supabase_running; start_web ;;
        3) check_dependencies; ensure_supabase_running; start_admin ;;
        4) check_dependencies; ensure_supabase_running; start_ocr ;;
        5) clean_cache ;;
        6) ./stop.sh ;;
        0) exit 0 ;;
        *) echo "無效選項"; sleep 1; show_menu ;;
    esac
}

# --- 主邏輯 ---
case "${1:-menu}" in
    all) start_all ;;
    web) check_dependencies; ensure_supabase_running; start_web ;;
    admin) check_dependencies; ensure_supabase_running; start_admin ;;
    ocr) check_dependencies; ensure_supabase_running; start_ocr ;;
    clean) clean_cache ;;
    menu) show_menu ;;
    *) echo "用法: $0 [all|web|admin|ocr|clean|menu]" ;;
esac
