#!/bin/bash
# 快速啟動腳本 - 在單一終端視窗同時運行 Web 和 Mobile

PROJECT_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"

echo "🛑 停止現有服務..."
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "expo" 2>/dev/null
pkill -f "metro" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
sleep 2

echo "🗑️ 清除快取..."
rm -rf "$PROJECT_ROOT/apps/web/.next" 2>/dev/null
rm -rf "$PROJECT_ROOT/apps/mobile/.expo" 2>/dev/null

echo ""
echo "🌐 啟動 Next.js Web (port 3000)..."
cd "$PROJECT_ROOT/apps/web"
npx next dev &
NEXT_PID=$!
echo "   Next.js PID: $NEXT_PID"

sleep 3

echo ""
echo "📱 啟動 Expo Mobile Web (port 8081)..."
cd "$PROJECT_ROOT/apps/mobile"
npx expo start --web --port 8081 &
EXPO_PID=$!
echo "   Expo PID: $EXPO_PID"

sleep 5

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ 服務已啟動！"
echo ""
echo "🌐 Web:    http://localhost:3000"
echo "📱 Mobile: http://localhost:8081"
echo ""
echo "按 Ctrl+C 停止所有服務"
echo "════════════════════════════════════════════════════════"

# 等待任一進程退出
wait $NEXT_PID $EXPO_PID
