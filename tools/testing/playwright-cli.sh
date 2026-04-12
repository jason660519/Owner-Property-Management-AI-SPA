#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/tools/testing/playwright-cli-version.txt"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "❌ version file not found: $VERSION_FILE"
  exit 1
fi

PINNED_VERSION="$(sed -n '1p' "$VERSION_FILE" | tr -d '[:space:]')"
if [[ -z "$PINNED_VERSION" ]]; then
  echo "❌ empty playwright-cli version in: $VERSION_FILE"
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage:"
  echo "  bash tools/testing/playwright-cli.sh --version"
  echo "  bash tools/testing/playwright-cli.sh open http://localhost:3001 --headed"
  exit 1
fi

npx --yes "@playwright/cli@${PINNED_VERSION}" "$@"
