#!/bin/bash
# Run LocalAgent for Cursor IDE tasks
# Usage: ./run-cursor.sh [superadmin base URL]
# Default: http://localhost:3001

set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[setup] Installing dependencies..."
  npm install
fi

if [ ! -f dist/dev-tasks-agent.js ]; then
  echo "[setup] Building TypeScript..."
  npm run build
fi

export LOCAL_AGENT_IDE="Cursor"
export PROJECT_ROOT="$(cd ../.. && pwd)"
export SUPERADMIN_BASE_URL="${1:-http://localhost:3001}"
# Cursor is at non-standard path on this machine
export CURSOR_CLI_PATH="/Applications/IDEs/Cursor.app/Contents/MacOS/Cursor"

echo "==========================================="
echo "  LocalAgent - Cursor IDE"
echo "  Project : $PROJECT_ROOT"
echo "  Target  : $SUPERADMIN_BASE_URL"
echo "  Cursor  : $CURSOR_CLI_PATH"
echo "==========================================="
echo ""

node dist/dev-tasks-agent.js
