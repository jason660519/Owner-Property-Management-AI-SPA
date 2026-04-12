#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
SOURCE_ENV="$REPO_ROOT/.env"
HERMES_HOME_DIR="${HERMES_HOME_DIR:-$HOME/.hermes-opm}"
TARGET_ENV="$HERMES_HOME_DIR/.env"

if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "Source .env not found: $SOURCE_ENV" >&2
  exit 1
fi

if [[ ! -f "$TARGET_ENV" ]]; then
  echo "Hermes .env not found: $TARGET_ENV" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SOURCE_ENV"
set +a

TELEGRAM_TOKEN="${TELGRAM_HERMES_BOT_TOKEN:-${TELEGRAM_HERMES_BOT_TOKEN:-}}"
if [[ -z "$TELEGRAM_TOKEN" ]]; then
  echo "Missing Telegram token in $SOURCE_ENV" >&2
  exit 1
fi

USER_IDS="$({
  curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates" \
    | python3 -c "import json,sys; obj=json.load(sys.stdin); ids=sorted({str((it.get('message') or it.get('edited_message') or {}).get('from',{}).get('id')) for it in obj.get('result',[]) if (it.get('message') or it.get('edited_message') or {}).get('from',{}).get('id') is not None}); print(','.join(ids))"
} || true)"

if [[ -z "$USER_IDS" ]]; then
  echo "No Telegram user IDs found yet. Send /start to your bot first, then re-run this script." >&2
  exit 1
fi

TMP_FILE="$(mktemp)"
awk -v ids="$USER_IDS" '
BEGIN { replaced = 0 }
/^TELEGRAM_ALLOWED_USERS=/ {
  print "TELEGRAM_ALLOWED_USERS=" ids
  replaced = 1
  next
}
{ print }
END {
  if (replaced == 0) {
    print "TELEGRAM_ALLOWED_USERS=" ids
  }
}
' "$TARGET_ENV" > "$TMP_FILE"

mv "$TMP_FILE" "$TARGET_ENV"
chmod 600 "$TARGET_ENV"

echo "Updated TELEGRAM_ALLOWED_USERS in $TARGET_ENV"
echo "Detected user IDs: $USER_IDS"
