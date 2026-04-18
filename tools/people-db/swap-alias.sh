#!/usr/bin/env bash
# Row 145 Sprint 5 — Atomically swap the `people` alias from v1 to v2.
#
# Workflow:
#   1. Reindex v1 → v2 with tools/people-db/reindex.ts
#   2. Spot-check v2 with curl _search
#   3. Run THIS script — atomic alias swap, search code keeps working
#   4. Once confident, manually DELETE the old index (NOT done here on
#      purpose — we never want a script to drop indexes silently)
#
# The application code currently queries `people_database` directly. After
# this swap, queries should target the alias `people` so future blue/green
# rolls are zero-downtime. Search code migration is tracked separately;
# this script only owns the alias machinery.
#
# Usage:
#   tools/people-db/swap-alias.sh                            # localhost
#   tools/people-db/swap-alias.sh --alias people --to people_database_v2
#   tools/people-db/swap-alias.sh --rollback                 # alias back to v1

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"
ALIAS="${ALIAS:-people}"
NEW_INDEX="${NEW_INDEX:-people_database_v2}"
OLD_INDEX="${OLD_INDEX:-people_database}"
ROLLBACK=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url) ES_URL="$2"; shift 2 ;;
    --alias) ALIAS="$2"; shift 2 ;;
    --to) NEW_INDEX="$2"; shift 2 ;;
    --from) OLD_INDEX="$2"; shift 2 ;;
    --rollback) ROLLBACK=1; shift ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *) echo -e "${RED}Unknown arg: $1${NC}"; exit 1 ;;
  esac
done

if [[ "${ROLLBACK}" -eq 1 ]]; then
  TARGET="${OLD_INDEX}"
  REMOVE_FROM="${NEW_INDEX}"
else
  TARGET="${NEW_INDEX}"
  REMOVE_FROM="${OLD_INDEX}"
fi

echo "ES_URL=${ES_URL}"
echo "alias '${ALIAS}': '${REMOVE_FROM}' → '${TARGET}'"

# Sanity: target index must exist
if ! curl -fsS -o /dev/null "${ES_URL}/${TARGET}"; then
  echo -e "${RED}✗ target index ${TARGET} does not exist${NC}"
  exit 1
fi

# Sanity: target should have at least as many docs as source (warn if not)
target_count=$(curl -fsS "${ES_URL}/${TARGET}/_count" | python3 -c 'import json,sys; print(json.load(sys.stdin)["count"])')
source_count=$(curl -fsS "${ES_URL}/${REMOVE_FROM}/_count" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["count"])' 2>/dev/null || echo "0")
echo "  ${REMOVE_FROM} doc count: ${source_count}"
echo "  ${TARGET}      doc count: ${target_count}"
if [[ "${target_count}" -lt "${source_count}" ]]; then
  echo -e "${YELLOW}⚠ target has fewer docs than source — reindex may be incomplete${NC}"
  read -p "Proceed anyway? (yes/no) " ok
  [[ "${ok}" != "yes" ]] && exit 1
fi

# Atomic alias swap: ES applies all actions in the array as one transaction
http_status=$(curl -sS -o /tmp/swap_alias_resp.json -w "%{http_code}" \
  -X POST "${ES_URL}/_aliases" \
  -H "Content-Type: application/json" \
  -d "{
    \"actions\": [
      { \"remove\": { \"index\": \"${REMOVE_FROM}\", \"alias\": \"${ALIAS}\" } },
      { \"add\":    { \"index\": \"${TARGET}\",      \"alias\": \"${ALIAS}\" } }
    ]
  }")

if [[ "${http_status}" != "200" ]]; then
  # Remove may fail if alias was never set on the old index — retry with add only
  echo -e "${YELLOW}⚠ atomic swap failed (HTTP ${http_status}); retrying as add-only${NC}"
  cat /tmp/swap_alias_resp.json
  curl -fsS -X POST "${ES_URL}/_aliases" \
    -H "Content-Type: application/json" \
    -d "{ \"actions\": [{ \"add\": { \"index\": \"${TARGET}\", \"alias\": \"${ALIAS}\" } }] }" \
    > /dev/null
fi

echo -e "${GREEN}✓ alias '${ALIAS}' now points at '${TARGET}'${NC}"
echo
echo "Validate with:"
echo "  curl ${ES_URL}/_alias/${ALIAS}"
echo "  curl ${ES_URL}/${ALIAS}/_count"
echo
echo -e "${YELLOW}Old index '${REMOVE_FROM}' was NOT deleted. To remove after a few days of confidence:${NC}"
echo "  curl -X DELETE ${ES_URL}/${REMOVE_FROM}"
