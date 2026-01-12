#!/bin/bash

# Owner Real Estate Agent SaaS - Phase One Setup Script
# 本脚本用于快速设置阶段一的本地开发环境

set -e

PROJECT_DIR="/Users/jason66/Owner Real Estate Agent SaaS"

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
echo "1. 复制 'anon key' 的值"
echo "2. 将其粘贴到 frontend/.env.local 的 EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo "3. 运行: cd frontend && npm install"
echo "4. 运行: npm install @supabase/supabase-js"
echo "5. 运行: npx expo start"
echo ""
echo "Studio 访问地址: http://localhost:54323"
