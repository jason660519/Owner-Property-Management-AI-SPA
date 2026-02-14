#!/usr/bin/env bash
#
# 通用測試腳本模板
# 使用方式：
#   chmod +x ./test-script-template.sh
#   ./test-script-template.sh web unit
#
# 參數：
#   $1 workspace 名稱（web | superadmin）
#   $2 類型（unit | e2e | coverage）
#
set -euo pipefail

WORKSPACE="${1:-web}"
TYPE="${2:-unit}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUIDE_DIR="$ROOT_DIR/docs/testing-guidelines and results"
RESULT_DIR="$GUIDE_DIR/test-results"
STAMP="$(date +%Y%m%d-%H%M)"

mkdir -p "$RESULT_DIR"

case "$TYPE" in
  unit)
    echo ">> Running unit/integration tests for workspace=$WORKSPACE"
    (cd "$ROOT_DIR" && npm run test --workspace "$WORKSPACE")
    ;;
  coverage)
    echo ">> Running coverage for workspace=$WORKSPACE"
    (cd "$ROOT_DIR" && npm run test:coverage --workspace "$WORKSPACE")
    # 歸檔 coverage 結果（若存在）
    SRC="$ROOT_DIR/apps/$WORKSPACE/coverage"
    DEST="$RESULT_DIR/coverage/$STAMP"
    if [ -d "$SRC" ]; then
      mkdir -p "$DEST"
      cp -a "$SRC/." "$DEST/"
      echo ">> Coverage archived to: $DEST"
    else
      echo "!! Coverage directory not found: $SRC"
    fi
    ;;
  e2e)
    echo ">> Running E2E tests for workspace=$WORKSPACE"
    (cd "$ROOT_DIR" && npx playwright install --with-deps || true)
    (cd "$ROOT_DIR" && npm run test:e2e --workspace "$WORKSPACE")
    # 歸檔 E2E 報告（若存在）
    SRC="$ROOT_DIR/apps/$WORKSPACE/playwright-report"
    DEST="$RESULT_DIR/e2e/$STAMP"
    if [ -d "$SRC" ]; then
      mkdir -p "$DEST"
      cp -a "$SRC/." "$DEST/"
      echo ">> E2E report archived to: $DEST"
    else
      echo "!! Playwright report not found: $SRC"
    fi
    ;;
  *)
    echo "Usage: $0 <workspace: web|superadmin> <type: unit|coverage|e2e>"
    exit 1
    ;;
esac

echo ">> Done."

