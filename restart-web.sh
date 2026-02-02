#!/bin/bash
# 停止 Web 服務
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 清除 Next.js 緩存
cd apps/web
rm -rf .next node_modules/.cache

# 重新啟動
cd ../..
npm run dev:web
