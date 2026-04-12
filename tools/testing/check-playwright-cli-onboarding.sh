#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/tools/testing/playwright-cli-version.txt"
SKILL_FILE="$PROJECT_ROOT/.claude/skills/playwright-cli/SKILL.md"
REQUIRED_NODE_MAJOR=18

EXIT_CODE=0

print_ok() {
  echo "✅ $1"
}

print_warn() {
  echo "⚠️  $1"
}

print_fail() {
  echo "❌ $1"
  EXIT_CODE=1
}

echo "Playwright CLI onboarding check"
echo "Project: $PROJECT_ROOT"
echo

if ! command -v node >/dev/null 2>&1; then
  print_fail "Node.js not found. Install Node.js ${REQUIRED_NODE_MAJOR}+ first."
else
  NODE_VERSION_RAW="$(node -v)"
  NODE_VERSION_NUM="${NODE_VERSION_RAW#v}"
  NODE_MAJOR="${NODE_VERSION_NUM%%.*}"
  if [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] && (( NODE_MAJOR >= REQUIRED_NODE_MAJOR )); then
    print_ok "Node.js version is $NODE_VERSION_RAW (>= v${REQUIRED_NODE_MAJOR})."
  else
    print_fail "Node.js version is $NODE_VERSION_RAW. Require v${REQUIRED_NODE_MAJOR}+."
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  print_fail "npm not found. Reinstall Node.js with npm."
else
  print_ok "npm is available ($(npm -v))."
fi

if [[ ! -f "$VERSION_FILE" ]]; then
  print_fail "Version file missing: $VERSION_FILE"
  PINNED_VERSION=""
else
  PINNED_VERSION="$(sed -n '1p' "$VERSION_FILE" | tr -d '[:space:]')"
  if [[ -z "$PINNED_VERSION" ]]; then
    print_fail "Pinned version is empty in $VERSION_FILE"
  else
    print_ok "Pinned @playwright/cli version: $PINNED_VERSION"
  fi
fi

if [[ -n "${PINNED_VERSION:-}" ]]; then
  if PWCLI_VERSION="$(npx --yes "@playwright/cli@${PINNED_VERSION}" --version 2>/dev/null)"; then
    print_ok "Playwright CLI is runnable via npx (@playwright/cli@$PWCLI_VERSION)."
  else
    print_fail "Cannot run Playwright CLI via npx for @playwright/cli@${PINNED_VERSION}."
    print_warn "Try: npm run pwcli:version"
  fi
fi

if [[ -f "$SKILL_FILE" ]]; then
  print_ok "Skills are installed ($SKILL_FILE)."
else
  print_fail "Skills not found at $SKILL_FILE"
  print_warn "Install skills with: bash tools/testing/playwright-cli.sh install --skills"
fi

echo
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "🎉 Onboarding check passed. New engineers can use Playwright CLI in this repo."
else
  echo "🚫 Onboarding check failed. Fix the items above and re-run this script."
fi

exit $EXIT_CODE
