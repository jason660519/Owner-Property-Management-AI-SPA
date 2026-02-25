#!/usr/bin/env bash
# Mark a dev task as succeeded or failed (for Cursor Agent / human after TDD + tests + git push).
# Usage: ./scripts/complete-dev-task.sh <taskId> [succeeded|failed]
# Example: ./scripts/complete-dev-task.sh 550e8400-e29b-41d4-a716-446655440000 succeeded

set -e
TASK_ID="${1:?Usage: $0 <taskId> [succeeded|failed]}"
STATUS="${2:-succeeded}"
BASE_URL="${SUPERADMIN_BASE_URL:-http://localhost:3001}"

if [[ "$STATUS" != "succeeded" && "$STATUS" != "failed" ]]; then
  echo "Status must be 'succeeded' or 'failed'" >&2
  exit 1
fi

echo "Marking task $TASK_ID as $STATUS (POST $BASE_URL/api/dev-tasks/$TASK_ID)"
curl -s -X POST "$BASE_URL/api/dev-tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"$STATUS\",\"resultSummary\":{\"message\":\"Marked complete via scripts/complete-dev-task.sh\",\"completedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
echo ""
