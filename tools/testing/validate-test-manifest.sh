#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="${1:-$PROJECT_ROOT/apps/superadmin/test-manifest.json}"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node is required"
  exit 1
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "❌ manifest not found: $MANIFEST_PATH"
  exit 1
fi

MANIFEST_ABS="$MANIFEST_PATH" PROJECT_ROOT_ABS="$PROJECT_ROOT" node <<'NODE'
const fs = require('fs');
const path = require('path');

const manifestPath = process.env.MANIFEST_ABS;
const projectRoot = process.env.PROJECT_ROOT_ABS;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in manifest: ${error.message}`);
}

if (!manifest || typeof manifest !== 'object') fail('manifest root must be object');
if (!Array.isArray(manifest.entries)) fail('manifest.entries must be array');
if (manifest.entries.length === 0) fail('manifest.entries cannot be empty');

const allowedTier = new Set(['pr', 'nightly']);
const allowedStatus = new Set(['active', 'quarantine']);
const allowedNightlyLayer = new Set(['smoke', 'regression']);
const seenIds = new Set();

for (const [idx, entry] of manifest.entries.entries()) {
  const where = `entries[${idx}]`;
  if (!entry || typeof entry !== 'object') fail(`${where} must be object`);

  const id = entry.id;
  if (typeof id !== 'string' || id.length === 0) fail(`${where}.id must be non-empty string`);
  if (!(id === 'common' || id === 'common-smoke' || id === 'common-regression' || /^\d{3}$/.test(id))) {
    fail(`${where}.id must be 'common'/'common-smoke'/'common-regression' or 3-digit`);
  }
  if (seenIds.has(id)) fail(`duplicate id in manifest: ${id}`);
  seenIds.add(id);

  if (typeof entry.name !== 'string' || entry.name.trim() === '') fail(`${where}.name must be non-empty string`);
  if (!allowedTier.has(entry.tier)) fail(`${where}.tier must be one of ${Array.from(allowedTier).join(', ')}`);
  if (!allowedStatus.has(entry.status)) fail(`${where}.status must be one of ${Array.from(allowedStatus).join(', ')}`);
  if (entry.tier === 'nightly') {
    if (!allowedNightlyLayer.has(entry.nightlyLayer)) {
      fail(`${where}.nightlyLayer must be one of ${Array.from(allowedNightlyLayer).join(', ')} when tier=nightly`);
    }
    if (!Number.isInteger(entry.nightlyOrder) || entry.nightlyOrder < 0) {
      fail(`${where}.nightlyOrder must be a non-negative integer when tier=nightly`);
    }
  } else if (entry.nightlyLayer !== undefined) {
    fail(`${where}.nightlyLayer is only allowed when tier=nightly`);
  } else if (entry.nightlyOrder !== undefined) {
    fail(`${where}.nightlyOrder is only allowed when tier=nightly`);
  }

  for (const key of ['unitPaths', 'e2ePaths', 'linkedToolScripts']) {
    if (!Array.isArray(entry[key])) fail(`${where}.${key} must be array`);
    for (const p of entry[key]) {
      if (typeof p !== 'string' || p.trim() === '') fail(`${where}.${key} contains invalid path`);
      const abs = path.join(projectRoot, p);
      if (!fs.existsSync(abs)) fail(`${where}.${key} path not found: ${p}`);
    }
  }
}

console.log(`✅ test manifest validation passed (${manifest.entries.length} entries)`);
NODE
