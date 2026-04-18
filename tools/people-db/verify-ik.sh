#!/usr/bin/env bash
# Row 145 Sprint 5 — Verify the IK Analyzer plugin is loaded in the running
# Elasticsearch instance. Sprint 5 originally planned to install the plugin,
# but it turned out to be baked into the project's custom ES image
# (backend/elasticsearch/Dockerfile installs analysis-ik + analysis-stconvert
# at build time). This script is the safety net: fail loudly if the running
# ES is missing the plugin so reindex/swap-alias don't silently fall back to
# the standard analyzer.
#
# Usage:
#   tools/people-db/verify-ik.sh                       # default localhost:9200
#   tools/people-db/verify-ik.sh --es-url http://...   # remote
#
# Exit codes:
#   0 — IK plugin present, both ik_smart and ik_max_word produce non-empty
#       tokenizations on a Chinese sample.
#   1 — IK plugin missing or analyzer call failed.

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url) ES_URL="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *) echo -e "${RED}Unknown arg: $1${NC}"; exit 1 ;;
  esac
done

echo "ES_URL=${ES_URL}"

if ! curl -fsS "${ES_URL}/_cluster/health" >/dev/null; then
  echo -e "${RED}✗ Elasticsearch unreachable at ${ES_URL}${NC}"
  exit 1
fi

# Plugin presence — analysis-ik registers as a node plugin
plugins=$(curl -fsS "${ES_URL}/_cat/plugins?h=component" || true)
if ! echo "${plugins}" | grep -q "analysis-ik"; then
  echo -e "${RED}✗ analysis-ik plugin NOT installed${NC}"
  echo "Installed plugins:"
  echo "${plugins}" | sed 's/^/  /'
  echo -e "${YELLOW}Hint: rebuild ES image — backend/elasticsearch/Dockerfile installs IK at build time${NC}"
  exit 1
fi
echo -e "${GREEN}✓ analysis-ik plugin present${NC}"

# Tokenizer smoke test — the dev-spec Sprint 5 acceptance check
sample="台北市南港區南港路二段 212 號"
for analyzer in ik_smart ik_max_word; do
  tokens=$(curl -fsS "${ES_URL}/_analyze" \
    -H "Content-Type: application/json" \
    -d "{\"analyzer\": \"${analyzer}\", \"text\": \"${sample}\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(",".join(t["token"] for t in d["tokens"]))')
  if [[ -z "${tokens}" ]]; then
    echo -e "${RED}✗ ${analyzer} returned no tokens${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ ${analyzer}: ${tokens}${NC}"
done

echo -e "${GREEN}IK analyzer healthy.${NC}"
