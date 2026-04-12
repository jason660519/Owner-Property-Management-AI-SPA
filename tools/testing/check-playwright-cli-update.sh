#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/tools/testing/playwright-cli-version.txt"
APPLY_UPDATE="${1:-}"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "❌ version file not found: $VERSION_FILE"
  exit 1
fi

CURRENT_VERSION="$(sed -n '1p' "$VERSION_FILE" | tr -d '[:space:]')"
if [[ -z "$CURRENT_VERSION" ]]; then
  echo "❌ empty playwright-cli version in: $VERSION_FILE"
  exit 1
fi

LATEST_VERSION="$(npm view @playwright/cli version | tr -d '[:space:]')"
if [[ -z "$LATEST_VERSION" ]]; then
  echo "❌ failed to resolve latest @playwright/cli version from npm"
  exit 1
fi

echo "Playwright CLI pinned version : $CURRENT_VERSION"
echo "Playwright CLI npm latest    : $LATEST_VERSION"

if [[ "$CURRENT_VERSION" == "$LATEST_VERSION" ]]; then
  echo "✅ already up to date"
  exit 0
fi

echo "⚠️ update available"

if [[ "$APPLY_UPDATE" == "--apply" ]]; then
  printf '%s\n' "$LATEST_VERSION" > "$VERSION_FILE"
  echo "✅ updated version file -> $LATEST_VERSION"
  echo "Run: npm run pwcli:version"
else
  echo "Run: npm run pwcli:update:apply"
fi
