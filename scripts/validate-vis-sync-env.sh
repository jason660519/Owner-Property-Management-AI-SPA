#!/usr/bin/env bash
# scripts/validate-vis-sync-env.sh
# Validates that all environment variables required by the VIS sync
# infrastructure (Row 137) are present and non-empty.
# Exit code 0 = all OK; exit code 1 = one or more variables missing.

set -euo pipefail

ERRORS=0

check_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "MISSING: $name" >&2
    ERRORS=$((ERRORS + 1))
  else
    echo "OK:      $name"
  fi
}

echo "=== VIS Sync Environment Validation ==="
echo ""

# Required — must be set for webhook validation to work
check_var PAPERCLIP_WEBHOOK_SECRET

# Required — needed by cron worker to call Paperclip API
check_var PAPERCLIP_API_KEY

# Required — Paperclip base URL (usually already set in .env.local)
check_var NEXT_PUBLIC_PAPERCLIP_BASE_URL

# Required — Supabase service role key for DB writes from webhook handler
check_var SUPABASE_SERVICE_ROLE_KEY

# Required — Supabase project URL
check_var NEXT_PUBLIC_SUPABASE_URL

echo ""
if [[ $ERRORS -gt 0 ]]; then
  echo "FAILED: $ERRORS variable(s) missing. Set them in .env.local and retry." >&2
  exit 1
else
  echo "All required environment variables are set."
fi
