#!/usr/bin/env bash
# Pre-commit secret scanner: blocks commits that introduce real API keys
# or .env files. Catches the most common provider token patterns by
# requiring realistic minimum lengths so placeholders like
# `sk-ant-xxxxx` or `ghp_demo` slip through (intentionally).
#
# Usage: invoked from .husky/pre-commit (no arguments).
# Exits 1 on any hit, 0 if clean.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ---------- 1) Block .env-style files from being committed ----------
# .gitignore already covers this, but `git add -f` can bypass it.
ENV_FILES=$(
  git diff --cached --name-only --diff-filter=A 2>/dev/null \
    | awk -F/ '{print $NF" "$0}' \
    | awk '{
        base=$1
        if (base ~ /^\.env(\.|$)/ &&
            base !~ /\.example$/ &&
            base !~ /\.template$/ &&
            base !~ /\.sample$/) {
          print $0
        }
      }' \
    | awk '{$1=""; sub(/^ /,""); print}' \
  || true
)

if [ -n "$ENV_FILES" ]; then
  echo "❌ Refusing to commit .env-style file(s):"
  echo "$ENV_FILES" | sed 's/^/   - /'
  echo ""
  echo "   .env files must stay local. If this is a sample, rename to .env.example."
  exit 1
fi

# ---------- 2) Scan staged additions for real-looking secrets ----------
# Pattern → minimum body length combos chosen to avoid placeholder hits.
# Placeholders like `ghp_xxxxx`, `sk-demo-1234`, `AIzademo` won't match.
PATTERNS=(
  'sk-ant-api03-[A-Za-z0-9_-]{50,}'      # Anthropic
  'sk-proj-[A-Za-z0-9_-]{50,}'           # OpenAI (project)
  'sk-svcacct-[A-Za-z0-9_-]{50,}'        # OpenAI (service account)
  'sk-or-v1-[a-f0-9]{50,}'               # OpenRouter
  'gh[ops]_[A-Za-z0-9]{30,}'             # GitHub PAT classic / OAuth
  'github_pat_[A-Za-z0-9_]{60,}'         # GitHub PAT fine-grained
  'AIza[A-Za-z0-9_-]{30,}'               # Google API
  'xai-[A-Za-z0-9_-]{40,}'               # xAI / Grok
  'hf_[A-Za-z0-9]{30,}'                  # HuggingFace
  'xoxe\.xoxp-[A-Za-z0-9-]{40,}'         # Slack user token
  'xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{20,}' # Slack bot token
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----' # PEM private key
  'AKIA[0-9A-Z]{16}'                     # AWS access key id
)

# Only scan added/modified lines (lines starting with `+`, but not the `+++` header).
DIFF=$(git diff --cached --no-color -U0 2>/dev/null || true)
if [ -z "$DIFF" ]; then
  exit 0
fi

HITS=""
for pattern in "${PATTERNS[@]}"; do
  match=$(echo "$DIFF" \
    | grep -E '^\+' \
    | grep -Ev '^\+\+\+' \
    | grep -E -e "$pattern" \
    || true)
  if [ -n "$match" ]; then
    HITS="${HITS}\n--- pattern: ${pattern}\n${match}"
  fi
done

if [ -n "$HITS" ]; then
  echo "❌ Possible real API key / secret in staged changes:"
  printf "%b\n" "$HITS" | sed 's/^/   /'
  echo ""
  echo "   If this is a placeholder, shorten it (e.g., ghp_xxxxx) or rename"
  echo "   the file to .env.example. If it really is a secret:"
  echo "   1. unstage:  git restore --staged <file>"
  echo "   2. rotate the key at the provider"
  echo "   3. move it to ~/.config/secrets.env or .env (gitignored)"
  exit 1
fi

exit 0
