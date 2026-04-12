#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="$PROJECT_ROOT/apps/superadmin/test-manifest.json"
VALIDATOR="$PROJECT_ROOT/tools/testing/validate-test-manifest.sh"
PWCLI_UPDATE_CHECKER="$PROJECT_ROOT/tools/testing/check-playwright-cli-update.sh"
LOG_DIR="$PROJECT_ROOT/logs/testing"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
LOG_FILE="$LOG_DIR/superadmin-nightly-$TIMESTAMP.log"
DRY_RUN="${DRY_RUN:-0}"

mkdir -p "$LOG_DIR"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "== Superadmin Nightly Test Runner =="
echo "timestamp: $TIMESTAMP"
echo "manifest: $MANIFEST_PATH"
echo "log: $LOG_FILE"

"$VALIDATOR" "$MANIFEST_PATH"

echo "Checking Playwright CLI updates (non-blocking)..."
if [[ "$DRY_RUN" == "1" ]]; then
  echo "[dry-run] bash $PWCLI_UPDATE_CHECKER"
elif ! bash "$PWCLI_UPDATE_CHECKER"; then
  echo "⚠️ Playwright CLI update check failed; continue nightly tests."
fi

echo "Nightly execution plan (id/layer/order):"
MANIFEST_PATH="$MANIFEST_PATH" node <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'));
const nightly = manifest.entries
  .filter((entry) => entry.status === 'active' && entry.tier === 'nightly')
  .sort((a, b) => {
    const layerWeight = (layer) => (layer === 'smoke' ? 0 : 1);
    return (
      layerWeight(a.nightlyLayer) - layerWeight(b.nightlyLayer) ||
      a.nightlyOrder - b.nightlyOrder ||
      a.id.localeCompare(b.id)
    );
  });

for (const entry of nightly) {
  const unitCount = Array.isArray(entry.unitPaths) ? entry.unitPaths.length : 0;
  const e2eCount = Array.isArray(entry.e2ePaths) ? entry.e2ePaths.length : 0;
  console.log(`- ${entry.id} | layer=${entry.nightlyLayer} | order=${entry.nightlyOrder} | unit=${unitCount} | e2e=${e2eCount}`);
}
NODE

SMOKE_UNIT_PATHS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && SMOKE_UNIT_PATHS+=("$line")
done < <(
  MANIFEST_PATH="$MANIFEST_PATH" node <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'));
const entries = manifest.entries
  .filter((entry) => entry.status === 'active' && entry.tier === 'nightly' && entry.nightlyLayer === 'smoke')
  .sort((a, b) => a.nightlyOrder - b.nightlyOrder || a.id.localeCompare(b.id));
for (const entry of entries) {
  for (const p of entry.unitPaths) console.log(p);
}
NODE
)

SMOKE_E2E_PATHS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && SMOKE_E2E_PATHS+=("$line")
done < <(
  MANIFEST_PATH="$MANIFEST_PATH" node <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'));
const entries = manifest.entries
  .filter((entry) => entry.status === 'active' && entry.tier === 'nightly' && entry.nightlyLayer === 'smoke')
  .sort((a, b) => a.nightlyOrder - b.nightlyOrder || a.id.localeCompare(b.id));
for (const entry of entries) {
  for (const p of entry.e2ePaths) console.log(p.replace(/^apps\/superadmin\/e2e\//, ''));
}
NODE
)

REGRESSION_UNIT_PATHS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && REGRESSION_UNIT_PATHS+=("$line")
done < <(
  MANIFEST_PATH="$MANIFEST_PATH" node <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'));
const entries = manifest.entries
  .filter((entry) => entry.status === 'active' && entry.tier === 'nightly' && entry.nightlyLayer === 'regression')
  .sort((a, b) => a.nightlyOrder - b.nightlyOrder || a.id.localeCompare(b.id));
for (const entry of entries) {
  for (const p of entry.unitPaths) console.log(p);
}
NODE
)

REGRESSION_E2E_PATHS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && REGRESSION_E2E_PATHS+=("$line")
done < <(
  MANIFEST_PATH="$MANIFEST_PATH" node <<'NODE'
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'));
const entries = manifest.entries
  .filter((entry) => entry.status === 'active' && entry.tier === 'nightly' && entry.nightlyLayer === 'regression')
  .sort((a, b) => a.nightlyOrder - b.nightlyOrder || a.id.localeCompare(b.id));
for (const entry of entries) {
  for (const p of entry.e2ePaths) console.log(p.replace(/^apps\/superadmin\/e2e\//, ''));
}
NODE
)

cd "$PROJECT_ROOT/apps/superadmin"

if [[ ${#SMOKE_UNIT_PATHS[@]} -gt 0 ]]; then
  echo "Running nightly smoke unit/integration tests (${#SMOKE_UNIT_PATHS[@]} files)..."
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] npx jest --runInBand --passWithNoTests ${SMOKE_UNIT_PATHS[*]}"
  else
    npx jest --runInBand --passWithNoTests "${SMOKE_UNIT_PATHS[@]}"
  fi
else
  echo "No nightly smoke unit/integration tests configured."
fi

if [[ ${#SMOKE_E2E_PATHS[@]} -gt 0 ]]; then
  echo "Running nightly smoke e2e tests (${#SMOKE_E2E_PATHS[@]} files)..."
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] npx playwright test ${SMOKE_E2E_PATHS[*]}"
  else
    npx playwright test "${SMOKE_E2E_PATHS[@]}"
  fi
else
  echo "No nightly smoke e2e tests configured."
fi

if [[ ${#REGRESSION_UNIT_PATHS[@]} -gt 0 ]]; then
  echo "Running nightly regression unit/integration tests (${#REGRESSION_UNIT_PATHS[@]} files)..."
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] npx jest --runInBand --passWithNoTests ${REGRESSION_UNIT_PATHS[*]}"
  else
    npx jest --runInBand --passWithNoTests "${REGRESSION_UNIT_PATHS[@]}"
  fi
else
  echo "No nightly regression unit/integration tests configured."
fi

if [[ ${#REGRESSION_E2E_PATHS[@]} -gt 0 ]]; then
  echo "Running nightly regression e2e tests (${#REGRESSION_E2E_PATHS[@]} files)..."
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] npx playwright test ${REGRESSION_E2E_PATHS[*]}"
  else
    npx playwright test "${REGRESSION_E2E_PATHS[@]}"
  fi
else
  echo "No nightly regression e2e tests configured."
fi

echo "✅ Nightly runner finished."
