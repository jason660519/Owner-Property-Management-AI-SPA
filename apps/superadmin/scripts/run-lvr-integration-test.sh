#!/usr/bin/env bash
set -euo pipefail
# 從 monorepo 根目錄執行：需本機 Supabase 已啟動（./start.sh 或 supabase start）
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT/apps/superadmin"

export SUPABASE_INTEGRATION_TEST=1
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(cd "$REPO_ROOT" && npx supabase status -o env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY=//p' | tr -d '"' || true)}"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "無法取得 SERVICE_ROLE_KEY。請先啟動本機 Supabase，或手動設定："
  echo "  export SUPABASE_SERVICE_ROLE_KEY=\"…\""
  exit 1
fi

npm test -- --runTestsByPath lib/utils/__tests__/lvr-land-transactions.integration.test.ts
