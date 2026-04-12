#!/usr/bin/env bash
# Non-interactive Paperclip health check for cron / CI / Mac mini watchdog.
# Usage:
#   ./tools/paperclip/health-check.sh
# Optional env:
#   PAPERCLIP_HEALTH_URL   default http://localhost:3187/api/health
#   PAPERCLIP_CONTAINER    default paperclip-paperclip-1
# Exit 0: HTTP health OK and (if docker available) container running.
# Exit 1: failure with message on stderr.

set -euo pipefail

DEFAULT_PORT="${PAPERCLIP_PORT:-3187}"
PAPERCLIP_HEALTH_URL="${PAPERCLIP_HEALTH_URL:-http://localhost:${DEFAULT_PORT}/api/health}"
PAPERCLIP_CONTAINER="${PAPERCLIP_CONTAINER:-paperclip-paperclip-1}"

fail() {
  echo "paperclip health-check: $*" >&2
  exit 1
}

if command -v docker >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    echo "paperclip health-check: docker not running (skip container check)" >&2
  else
    if ! docker ps --format '{{.Names}}' | grep -qx "$PAPERCLIP_CONTAINER"; then
      fail "container $PAPERCLIP_CONTAINER not in docker ps"
    fi
  fi
fi

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required"
fi

if ! curl -fsS "$PAPERCLIP_HEALTH_URL" >/dev/null; then
  fail "HTTP health failed: $PAPERCLIP_HEALTH_URL"
fi

echo "paperclip health-check: OK ($PAPERCLIP_HEALTH_URL)"
exit 0
