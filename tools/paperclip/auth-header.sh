#!/usr/bin/env bash
# tools/paperclip/auth-header.sh
#
# Emit the `Authorization: Bearer $INTERNAL_API_KEY` header line for curl
# calls to guarded /api/paperclip/* endpoints.
#
# Issue #34 PR C introduced a dual-track auth model on those routes: either a
# Supabase superadmin session (browser) OR this bearer token (shell / MCP /
# cron). Skills and shell tooling use this helper to avoid copy-pasting the
# secret into every command.
#
# Key resolution order:
#   1. $INTERNAL_API_KEY env var (highest priority)
#   2. apps/superadmin/.env.local (the usual developer setup)
#
# Usage:
#   curl -s -X POST "http://localhost:3001/api/paperclip/issues" \
#     -H "Content-Type: application/json" \
#     -H "$(bash tools/paperclip/auth-header.sh)" \
#     -d '{ "title": "[Row 031] ...", "description": "..." }'
#
# Exits non-zero with a message on stderr if no key is discoverable.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/apps/superadmin/.env.local"

KEY="${INTERNAL_API_KEY:-}"

if [ -z "$KEY" ] && [ -f "$ENV_FILE" ]; then
  # Match INTERNAL_API_KEY=... (skip commented lines), take first match, strip
  # optional surrounding quotes ("..." or '...').
  KEY=$(
    grep -E '^[[:space:]]*INTERNAL_API_KEY=' "$ENV_FILE" \
      | head -n1 \
      | sed -E 's/^[[:space:]]*INTERNAL_API_KEY=//' \
      | sed -E 's/^"(.*)"$/\1/' \
      | sed -E "s/^'(.*)'$/\1/" \
      | tr -d '\r\n'
  )
fi

if [ -z "$KEY" ]; then
  cat >&2 <<EOF
ERROR: INTERNAL_API_KEY not found.
  - Set \`INTERNAL_API_KEY=<secret>\` in apps/superadmin/.env.local, or
  - Export it in the current shell: \`export INTERNAL_API_KEY=<secret>\`
  - Generate with: \`openssl rand -hex 32\`
  - See .env.example and docs/auth/internal-api-key.md for details.
EOF
  exit 1
fi

printf 'Authorization: Bearer %s' "$KEY"
