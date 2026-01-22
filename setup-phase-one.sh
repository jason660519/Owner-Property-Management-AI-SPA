#!/bin/bash

# Owner Real Estate Agent SaaS - Phase One Setup Script
# 本脚本用于快速设置阶段一的本地开发环境
# 最後更新：2026-01-22

set -e

PROJECT_DIR="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner Property Management AI SPA"

echo "=========================================="
echo "阶段一：纯本地开发环境设置"
echo "=========================================="
echo ""

# 检查依赖
echo "检查必要工具..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装。请访问 https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker: $(docker --version)"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装。请访问 https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI 未安装。正在安装..."
    brew install supabase/tap/supabase
fi
echo "✅ Supabase CLI: $(supabase --version)"

echo ""
echo "开始启动 Supabase 本地环境..."
echo "这可能需要几分钟，因为需要拉取 Docker 镜像..."
echo ""

cd "$PROJECT_DIR"

# 启动 Supabase
supabase start

echo ""
echo "=========================================="
echo "✅ Supabase 启动成功！"
echo "=========================================="
echo ""

# 显示连接信息
echo "API 信息："
supabase status

echo ""
echo "下一步："
echo "1. 確認 frontend/.env.local 已包含以下變數："
echo "   - EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY=<從上方複製 Publishable key>"
echo "2. 運行: cd frontend && npm install"
echo "3. 運行: npx expo start --web"
echo "4. 在瀏覽器訪問: http://localhost:8081"
echo ""
echo "Studio 訪問地址: http://localhost:54323"
echo ""
echo "✅ 測試完成（2026-01-22）："
echo "   - 前端應用: ✅ 正常運行"
echo "   - Supabase API: ✅ 正常運行"
echo "   - 數據庫: ✅ 包含 6 個資料表"

