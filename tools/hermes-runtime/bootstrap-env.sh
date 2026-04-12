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

mkdir -p "$HERMES_HOME_DIR"

set -a
# shellcheck disable=SC1090
source "$SOURCE_ENV"
set +a

TELEGRAM_TOKEN="${TELGRAM_HERMES_BOT_TOKEN:-${TELEGRAM_HERMES_BOT_TOKEN:-}}"
OPENROUTER_KEY="${OPENROUTER_API_KEY:-}"
TELEGRAM_USERS="${TELEGRAM_ALLOWED_USERS:-}"

if [[ -z "$TELEGRAM_USERS" && -f "$TARGET_ENV" ]]; then
  TELEGRAM_USERS="$(awk -F= '/^TELEGRAM_ALLOWED_USERS=/{print $2}' "$TARGET_ENV" | tail -n 1)"
fi

ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"
GOOGLE_KEY="${GEMINI_API_KEY:-${GOOGLE_API_KEY:-}}"
GEMINI_KEY="${GEMINI_API_KEY:-${GOOGLE_API_KEY:-}}"
DEEPSEEK_KEY="${DEEPSEEK_API_KEY:-}"
DASHSCOPE_KEY="${DASHSCOPE_API_KEY:-${QWEN_API_KEY:-}}"
QWEN_KEY="${QWEN_API_KEY:-${DASHSCOPE_API_KEY:-}}"
GLM_KEY="${GLM_API_KEY:-}"
KIMI_KEY="${KIMI_API_KEY:-}"
MINIMAX_KEY="${MINIMAX_API_KEY:-}"

if [[ -z "$TELEGRAM_TOKEN" ]]; then
  echo "Missing TELGRAM_HERMES_BOT_TOKEN (or TELEGRAM_HERMES_BOT_TOKEN) in $SOURCE_ENV" >&2
  exit 1
fi

if [[ -z "$OPENROUTER_KEY" ]]; then
  echo "Missing OPENROUTER_API_KEY in $SOURCE_ENV" >&2
  exit 1
fi

cat > "$TARGET_ENV" <<EOF
OPENROUTER_API_KEY=$OPENROUTER_KEY
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
GATEWAY_ALLOW_ALL_USERS=false
# Fill this after you know your Telegram numeric user ID(s), comma-separated.
TELEGRAM_ALLOWED_USERS=$TELEGRAM_USERS
EOF

# Forward additional provider credentials when available.
[[ -n "$ANTHROPIC_KEY" ]] && echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> "$TARGET_ENV"
[[ -n "$OPENAI_KEY" ]] && echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$TARGET_ENV"
[[ -n "$GOOGLE_KEY" ]] && echo "GOOGLE_API_KEY=$GOOGLE_KEY" >> "$TARGET_ENV"
[[ -n "$GEMINI_KEY" ]] && echo "GEMINI_API_KEY=$GEMINI_KEY" >> "$TARGET_ENV"
[[ -n "$DEEPSEEK_KEY" ]] && echo "DEEPSEEK_API_KEY=$DEEPSEEK_KEY" >> "$TARGET_ENV"
[[ -n "$DASHSCOPE_KEY" ]] && echo "DASHSCOPE_API_KEY=$DASHSCOPE_KEY" >> "$TARGET_ENV"
[[ -n "$QWEN_KEY" ]] && echo "QWEN_API_KEY=$QWEN_KEY" >> "$TARGET_ENV"
[[ -n "$GLM_KEY" ]] && echo "GLM_API_KEY=$GLM_KEY" >> "$TARGET_ENV"
[[ -n "$KIMI_KEY" ]] && echo "KIMI_API_KEY=$KIMI_KEY" >> "$TARGET_ENV"
[[ -n "$MINIMAX_KEY" ]] && echo "MINIMAX_API_KEY=$MINIMAX_KEY" >> "$TARGET_ENV"

chmod 600 "$TARGET_ENV"

echo "Wrote Hermes env to: $TARGET_ENV"
if [[ -z "$TELEGRAM_USERS" ]]; then
  echo "TELEGRAM_ALLOWED_USERS is empty. Send /start to your bot, then update this value." >&2
fi
