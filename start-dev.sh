#!/bin/bash

# 開發環境啟動腳本 - 分別啟動 Web 和 Mobile
# 創建時間: 2026-02-01
# 用途: 穩定啟動開發服務器，提供取代 Turbo monorepo 的工作流程

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 項目根目錄
PROJECT_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Owner Property Management - 開發環境啟動${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 函數：停止現有服務
stop_services() {
    echo -e "${YELLOW}🛑 停止現有服務...${NC}"
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "expo" 2>/dev/null || true
    pkill -f "metro" 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ 服務已停止${NC}"
}

# 函數：清除快取
clean_cache() {
    echo -e "${YELLOW}🗑️  清除快取...${NC}"
    cd "$PROJECT_ROOT"
    rm -rf apps/web/.next 2>/dev/null || true
    rm -rf apps/mobile/.expo 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    echo -e "${GREEN}✅ 快取已清除${NC}"
}

# 函數：啟動 Web (Next.js)
start_web() {
    echo -e "${BLUE}🌐 啟動 Next.js Web 應用...${NC}"
    cd "$PROJECT_ROOT/apps/web"
    
    # 在新的終端視窗啟動
    osascript -e 'tell application "Terminal"
        do script "cd \"'"$PROJECT_ROOT"'/apps/web\" && npx next dev"
        set custom title of front window to \"Next.js Web - Port 3000\"
    end tell' &>/dev/null &
    
    echo -e "${GREEN}✅ Web 服務啟動中... (http://localhost:3000)${NC}"
}

# 函數：啟動 Mobile (Expo)
start_mobile() {
    echo -e "${BLUE}📱 啟動 Expo Mobile 應用...${NC}"
    cd "$PROJECT_ROOT/apps/mobile"
    
    # 在新的終端視窗啟動 - 直接使用 --web 參數啟動 web 版本
    osascript -e 'tell application "Terminal"
        do script "cd \"'"$PROJECT_ROOT"'/apps/mobile\" && npx expo start --web --port 8081"
        set custom title of front window to \"Expo Mobile - Port 8081\"
    end tell' &>/dev/null &
    
    echo -e "${GREEN}✅ Mobile 服務啟動中... (http://localhost:8081)${NC}"
    echo -e "${YELLOW}💡 Web 版本會自動在 http://localhost:8081 啟動${NC}"
}

# 主菜單
show_menu() {
    echo ""
    echo -e "${BLUE}請選擇啟動模式：${NC}"
    echo "1) 啟動 Web (Next.js - 端口 3000)"
    echo "2) 啟動 Mobile (Expo - 端口 8081)"
    echo "3) 同時啟動 Web + Mobile"
    echo "4) 停止所有服務"
    echo "5) 清除快取並重新啟動"
    echo "0) 退出"
    echo ""
    read -p "請輸入選項 [0-5]: " choice
}

# 主邏輯
case "${1:-menu}" in
    web)
        stop_services
        start_web
        ;;
    mobile)
        stop_services
        start_mobile
        ;;
    both)
        stop_services
        start_web
        sleep 2
        start_mobile
        ;;
    stop)
        stop_services
        ;;
    clean)
        stop_services
        clean_cache
        ;;
    menu)
        while true; do
            show_menu
            case $choice in
                1)
                    stop_services
                    start_web
                    ;;
                2)
                    stop_services
                    start_mobile
                    ;;
                3)
                    stop_services
                    start_web
                    sleep 2
                    start_mobile
                    ;;
                4)
                    stop_services
                    ;;
                5)
                    stop_services
                    clean_cache
                    start_web
                    sleep 2
                    start_mobile
                    ;;
                0)
                    echo -e "${GREEN}👋 再見！${NC}"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ 無效選項，請重試${NC}"
                    ;;
            esac
            echo ""
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        done
        ;;
    *)
        echo -e "${RED}用法: $0 [web|mobile|both|stop|clean|menu]${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 操作完成${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo -e "  • Web 應用: ${BLUE}http://localhost:3000${NC}"
echo -e "  • Mobile 應用: ${BLUE}http://localhost:8081${NC} (需在 Expo 終端按 'w')"
echo -e "  • 停止服務: ${YELLOW}./start-dev.sh stop${NC}"
echo ""
