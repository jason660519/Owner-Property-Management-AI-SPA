#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT_DIR/apps/superadmin/.env.local"
ENV_PAPERCLIP="$ROOT_DIR/docker/paperclip/.env.paperclip"
DEFAULT_DATA_DIR="$HOME/.paperclip-data-owner-property-management"

SINCE_ISO=""
FIXPOINT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since-iso)
      SINCE_ISO="${2:-}"
      shift 2
      ;;
    --fixpoint-file)
      FIXPOINT_FILE="${2:-}"
      shift 2
      ;;
    *)
      echo "[error] unknown argument: $1" >&2
      echo "Usage: $0 [--since-iso YYYY-MM-DDTHH:MM:SSZ] [--fixpoint-file /path/file]" >&2
      exit 1
      ;;
  esac
done

if [[ -f "$ENV_LOCAL" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_LOCAL" >/dev/null 2>&1 || true
  set +a
fi

BASE="${NEXT_PUBLIC_PAPERCLIP_BASE_URL:-http://localhost:3187}"
API="${PAPERCLIP_API_KEY:-}"
CID="${PAPERCLIP_COMPANY_ID:-${NEXT_PUBLIC_PAPERCLIP_COMPANY_ID:-}}"

if [[ -z "$API" || -z "$CID" ]]; then
  echo "[error] missing PAPERCLIP_API_KEY or PAPERCLIP_COMPANY_ID" >&2
  exit 1
fi

if [[ -z "$FIXPOINT_FILE" ]]; then
  PAPERCLIP_DATA_DIR=""
  if [[ -f "$ENV_PAPERCLIP" ]]; then
    PAPERCLIP_DATA_DIR="$(grep '^PAPERCLIP_DATA_DIR=' "$ENV_PAPERCLIP" | head -n1 | cut -d= -f2-)"
  fi
  PAPERCLIP_DATA_DIR="${PAPERCLIP_DATA_DIR:-$DEFAULT_DATA_DIR}"
  FIXPOINT_FILE="$PAPERCLIP_DATA_DIR/health/last-oauth-fixpoint.txt"
fi

if [[ -z "$SINCE_ISO" && -f "$FIXPOINT_FILE" ]]; then
  SINCE_ISO="$(cat "$FIXPOINT_FILE" 2>/dev/null | tr -d '\n')"
fi

TMP_AGENTS="$(mktemp)"
TMP_RUNS="$(mktemp)"
trap 'rm -f "$TMP_AGENTS" "$TMP_RUNS"' EXIT

curl -H "Authorization: Bearer $API" "$BASE/api/companies/$CID/agents" > "$TMP_AGENTS"
curl -H "Authorization: Bearer $API" "$BASE/api/companies/$CID/heartbeat-runs?limit=500" > "$TMP_RUNS"
export SINCE_ISO FIXPOINT_FILE

node - "$TMP_AGENTS" "$TMP_RUNS" <<'NODE'
const fs = require('fs');
const agents = JSON.parse(fs.readFileSync(process.argv[2], 'utf8') || '[]');
const runs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8') || '[]');
const sinceIso = process.env.SINCE_ISO || '';
const fixpointFile = process.env.FIXPOINT_FILE || '';

const now = Date.now();
const since = now - 10 * 60 * 1000;
const recent = runs.filter(r => new Date(r.startedAt).getTime() >= since);

const byStatus = recent.reduce((m, r) => {
  m[r.status] = (m[r.status] || 0) + 1;
  return m;
}, {});

const agentsSummary = agents.map(a => ({
  name: a.name,
  status: a.status,
  adapterType: a.adapterType,
}));

const latestRuns = runs.slice(0, 10).map(r => ({
  startedAt: r.startedAt,
  status: r.status,
  agentId: r.agentId,
  error: r.error || null,
}));

const sinceTimestamp = sinceIso ? Date.parse(sinceIso) : Number.NaN;
const sinceFixpointRuns = Number.isFinite(sinceTimestamp)
  ? runs.filter(r => new Date(r.startedAt).getTime() >= sinceTimestamp)
  : [];
const sinceFixpointByStatus = sinceFixpointRuns.reduce((m, r) => {
  m[r.status] = (m[r.status] || 0) + 1;
  return m;
}, {});

console.log(JSON.stringify({
  window: 'last_10_minutes',
  fixpoint: {
    file: fixpointFile,
    sinceIso: sinceIso || null,
    runCount: sinceFixpointRuns.length,
    byStatus: sinceFixpointByStatus,
  },
  recentRunCount: recent.length,
  byStatus,
  agents: agentsSummary,
  latestRuns,
}, null, 2));
NODE
