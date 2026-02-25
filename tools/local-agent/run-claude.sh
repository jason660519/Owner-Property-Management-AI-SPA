#!/bin/bash
# Run LocalAgent for Claude CLI tasks
# Usage: ./run-claude.sh [superadmin base URL]
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

export LOCAL_AGENT_IDE="Claude CLI"
export PROJECT_ROOT="$(cd ../.. && pwd)"
export SUPERADMIN_BASE_URL="${1:-http://localhost:3001}"
# Claude Code CLI path (auto-detected, override if needed)
export CLAUDE_CLI_PATH="${CLAUDE_CLI_PATH:-$HOME/.local/bin/claude}"

echo "==========================================="
echo "  LocalAgent - Claude CLI"
echo "  Project : $PROJECT_ROOT"
echo "  Target  : $SUPERADMIN_BASE_URL"
echo "  Claude  : $CLAUDE_CLI_PATH"
echo "==========================================="
echo ""

node dist/dev-tasks-agent.js
