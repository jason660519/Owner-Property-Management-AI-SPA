#!/bin/bash

# Owner Real Estate Agent SaaS - Phase One Setup Script (Optimized)
# 本脚本用于快速设置阶段一的本地开发环境
# 優化內容：路徑修復、條件式啟動、依賴檢查優化、日誌記錄、執行計時
# 最後更新：2026-01-30

set -e
SECONDS=0
LOG_FILE="setup_debug.log"

# 使用當前腳本所在目錄，避免硬編碼路徑錯誤
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "阶段一：纯本地开发环境设置 (優化版)"
echo "=========================================="
echo "正在初始化... (詳細日誌: $LOG_FILE)"
echo "Start setup at $(date)" > "$LOG_FILE"

# 函數：檢查命令是否存在，不輸出版本號以節省時間，除非失敗
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 未安装。請安裝後重試。" | tee -a "$LOG_FILE"
        return 1
    fi
    return 0
}

# 1. 環境檢查 (快速模式)
echo -n "1. 檢查環境依賴... "
MISSING_DEPS=0
check_dependency docker || MISSING_DEPS=1
check_dependency node || MISSING_DEPS=1
check_dependency supabase || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo "失敗"
    exit 1
fi
echo "✅ 完成"

# 2. Supabase 狀態檢查與啟動
cd "$PROJECT_DIR"
echo -n "2. 檢查 Supabase 服務... "

# 使用 docker ps 快速檢查核心容器是否運行，避免調用較慢的 supabase status
if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
    echo "⚡️ 服務已在運行 (跳過啟動)"
    echo "Supabase services check: Running" >> "$LOG_FILE"
else
    echo "🔄 正在啟動..."
    echo "Starting supabase..." >> "$LOG_FILE"
    # 使用後台執行並將輸出重定向到日誌
    if supabase start >> "$LOG_FILE" 2>&1; then
        echo "✅ 啟動成功"
    else
        echo "❌ 啟動失敗 (查看 $LOG_FILE 獲取詳情)"
        exit 1
    fi
fi

# 3. 清除快取（避免 Turbopack 資料庫錯誤）
echo -n "3. 清除開發快取... "
rm -rf apps/web/.next apps/web/node_modules/.cache 2>/dev/null || true
echo "✅ 完成"

DURATION=$SECONDS
echo ""
echo "=========================================="
echo "✅ 環境準備就緒！(耗時: ${DURATION}秒)"
echo "=========================================="
echo ""

# 4. 顯示關鍵信息 (靜態顯示以節省時間，這些是 Supabase 本地開發的默認端口)
echo "服務訪問地址："
echo "   - Studio (儀表板):  http://localhost:54323"
echo "   - API Gateway:      http://localhost:54321"
echo "   - Mailpit (郵件):   http://localhost:54324"
echo ""
echo "前端開發指令："
echo "   - 雙端同時啟動:  ./start-dev.sh both"
echo "   - 僅 Web 端:      npm run dev:web"
echo "   - 僅 Mobile 端:   npm run dev:mobile"
echo ""
echo "💡 提示：首次啟動可能需要 10-20 秒編譯時間"
echo ""
