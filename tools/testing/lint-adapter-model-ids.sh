#!/usr/bin/env bash
#
# lint-adapter-model-ids.sh
#
# Enforces provider-prefix rules for adapter model ids declared in
# apps/superadmin/lib/adapter-config.ts.
#
# Rule (see project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md §2 困難 B):
#   When `provider` is 'opencode' or 'kilo', the `model` field MUST begin with
#   'opencode/' or 'openrouter/'. CLIs that route through an aggregator need
#   the full <provider>/<vendor>/<model> slug; a bare vendor id silently falls
#   back to `openrouter/auto`, which masks version drift.
#
# Legacy exemptions: a short allowlist of ids that predate this lint is
# tolerated with a warning — their correct replacement model id is blocked on
# the Row 100 P1 baseline self-report audit. New rows get no such grace.
#
# Usage:
#   tools/testing/lint-adapter-model-ids.sh [path/to/adapter-config.ts]
#
# Delegates parsing to inline Node so it runs on any shell that has Node
# installed (bash 3.2 on macOS, GNU bash in Linux CI, Git Bash on Windows).

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_PATH="${1:-$PROJECT_ROOT/apps/superadmin/lib/adapter-config.ts}"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node is required to run lint-adapter-model-ids" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "❌ adapter-config.ts not found: $CONFIG_PATH" >&2
  exit 1
fi

CONFIG_ABS="$CONFIG_PATH" node <<'NODE'
const fs = require('fs');

const configPath = process.env.CONFIG_ABS;
const src = fs.readFileSync(configPath, 'utf8');

const anchor = 'ADAPTER_CONFIG_ITEMS';
const anchorIdx = src.indexOf(anchor);
if (anchorIdx === -1) {
  console.error(`❌ ${anchor} not found in ${configPath}`);
  process.exit(2);
}
// Skip past the type annotation (AdapterConfigItem[]) to the `=` that starts
// the array literal, then find the opening bracket of the literal itself.
const equalsIdx = src.indexOf('=', anchorIdx);
const openBracket = equalsIdx === -1 ? -1 : src.indexOf('[', equalsIdx);
if (openBracket === -1) {
  console.error(`❌ ${anchor} array literal not found`);
  process.exit(2);
}

// Walk the array body, collecting each top-level { ... } block by brace depth.
// We only track braces and brackets; strings inside are balanced (no unescaped
// braces in the source), so a plain counter is enough for this file.
const entries = [];
let depth = 0;
let blockStart = -1;
let closed = false;
for (let i = openBracket + 1; i < src.length; i++) {
  const ch = src[i];
  if (ch === '[') {
    depth++;
  } else if (ch === ']') {
    if (depth === 0) {
      closed = true;
      break;
    }
    depth--;
  } else if (ch === '{') {
    if (depth === 0) blockStart = i;
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0 && blockStart !== -1) {
      entries.push({ text: src.slice(blockStart, i + 1), offset: blockStart });
      blockStart = -1;
    }
  }
}

if (!closed) {
  console.error(`❌ ${anchor} array literal never closed`);
  process.exit(2);
}
if (entries.length === 0) {
  console.error(`❌ No adapter entries parsed from ${anchor}`);
  process.exit(2);
}

const PROVIDERS_REQUIRING_PREFIX = new Set(['opencode', 'kilo']);
const ALLOWED_PREFIXES = ['opencode/', 'openrouter/'];

// Temporary exemptions — rows that predate this lint and whose correct
// replacement model id is blocked on the Row 100 P1 baseline self-report
// audit (see §5 P0/P1 of the 2026-04-19 dev log). Each entry should be
// removed in the same PR that fixes the row's model id.
// DO NOT add new entries here without explicit approval — the point of
// this lint is to stop new rows from landing without a prefix.
const LEGACY_EXEMPTIONS = new Set([
  // All legacy violations resolved as of 2026-04-25.
]);

const violations = [];
const exempted = [];

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

for (const entry of entries) {
  const idMatch = entry.text.match(/\bid:\s*'([^']+)'/);
  const providerMatch = entry.text.match(/\bprovider:\s*'([^']+)'/);
  const modelMatch = entry.text.match(/\bmodel:\s*'([^']+)'/);
  const line = lineOf(src, entry.offset);

  if (!idMatch || !providerMatch || !modelMatch) {
    violations.push({
      id: idMatch ? idMatch[1] : '<unknown>',
      line,
      reason: 'missing id/provider/model field (is the block malformed?)',
    });
    continue;
  }

  const [, id] = idMatch;
  const [, provider] = providerMatch;
  const [, model] = modelMatch;

  if (!PROVIDERS_REQUIRING_PREFIX.has(provider)) continue;
  if (ALLOWED_PREFIXES.some((p) => model.startsWith(p))) continue;

  const record = {
    id,
    provider,
    model,
    line,
    reason: `model must start with one of: ${ALLOWED_PREFIXES.join(', ')}`,
  };
  if (LEGACY_EXEMPTIONS.has(id)) {
    exempted.push(record);
  } else {
    violations.push(record);
  }
}

if (exempted.length > 0) {
  console.warn(
    `⚠️  lint-adapter-model-ids: ${exempted.length} legacy exemption(s) still pending Row 100 P1 audit:`,
  );
  for (const v of exempted) {
    console.warn(`  - [${v.id}] (line ${v.line}) provider='${v.provider}' model='${v.model}'`);
  }
}

if (violations.length === 0) {
  console.log(`✅ lint-adapter-model-ids: ${entries.length - exempted.length} adapter entries OK`);
  process.exit(0);
}

console.error(
  `❌ lint-adapter-model-ids: ${violations.length} violation(s) in ${configPath}`,
);
for (const v of violations) {
  const prefix = `  - [${v.id}] (line ${v.line})`;
  if (v.provider) {
    console.error(`${prefix} provider='${v.provider}' model='${v.model}' — ${v.reason}`);
  } else {
    console.error(`${prefix} ${v.reason}`);
  }
}
console.error('');
console.error('Fix: prepend the CLI route prefix to the model id.');
console.error('  • opencode native model → opencode/<model>           (e.g. opencode/minimax-m2.5)');
console.error('  • aggregator route     → openrouter/<vendor>/<model> (e.g. openrouter/minimax/minimax-m2.5)');
console.error('');
console.error(
  'Background: project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md §2 困難 B',
);
process.exit(1);
NODE
