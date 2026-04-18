#!/usr/bin/env bash
# Adds new keyword fields to the people_database Elasticsearch index so the
# hierarchical dataset tree (Row 144) can filter by dataset_path prefix.
#
# Elasticsearch allows adding new fields to an existing index mapping without
# a full reindex, so this script is safe to run on live data. Documents that
# do not yet have dataset_path will simply be missing that field until the
# next import or backfill job populates it.
#
# Usage:
#   tools/people-db/add-dataset-path-mapping.sh [--es-url URL] [--index NAME]

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"
INDEX_NAME="${INDEX_NAME:-people_database}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Add dataset_path / dataset_root / dataset_subpath / address_normalized to people_database.

Usage:
  tools/people-db/add-dataset-path-mapping.sh [--es-url URL] [--index NAME]

Options:
  --es-url URL   Elasticsearch base URL (default: http://127.0.0.1:9200)
  --index NAME   Index name (default: people_database)
  -h, --help     Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url)
      ES_URL="$2"
      shift 2
      ;;
    --index)
      INDEX_NAME="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${NC}"
      usage
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}Missing required command: curl${NC}"
  exit 1
fi

echo -e "${BLUE}== Adding dataset_path mapping to ${INDEX_NAME} ==${NC}"
echo "ES_URL=${ES_URL}"

# Confirm the index already exists before we try to update its mapping.
if ! curl -fsS -o /dev/null "${ES_URL}/${INDEX_NAME}"; then
  echo -e "${RED}Index not found: ${INDEX_NAME}${NC}"
  echo -e "${YELLOW}Hint: run one people-db import/search first so the index is created.${NC}"
  exit 1
fi

# Apply additive mapping (existing docs stay intact, new docs can populate).
http_status=$(curl -sS -o /tmp/people_db_mapping_response.json -w "%{http_code}" \
  -X PUT "${ES_URL}/${INDEX_NAME}/_mapping" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "dataset_root":      { "type": "keyword" },
      "dataset_subpath":   { "type": "keyword" },
      "dataset_path":      { "type": "keyword" },
      "address_normalized": { "type": "keyword" },
      "address_tokens":    { "type": "keyword" }
    }
  }')

if [[ "${http_status}" != "200" ]]; then
  echo -e "${RED}Mapping update failed (HTTP ${http_status}):${NC}"
  cat /tmp/people_db_mapping_response.json
  exit 1
fi

echo -e "${GREEN}✓ Mapping updated.${NC}"

# Backfill existing docs: dataset_path defaults to legacy data_source, and
# dataset_root is the first path segment (or the full string if no separator).
echo -e "${BLUE}Backfilling dataset_path from data_source…${NC}"

backfill_status=$(curl -sS -o /tmp/people_db_backfill_response.json -w "%{http_code}" \
  -X POST "${ES_URL}/${INDEX_NAME}/_update_by_query?refresh=true&wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must":    [ { "exists": { "field": "data_source" } } ],
        "must_not": [ { "exists": { "field": "dataset_path" } } ]
      }
    },
    "script": {
      "lang": "painless",
      "source": "String src = ctx._source.data_source; if (src != null && !src.isEmpty()) { ctx._source.dataset_path = src; int idx = src.indexOf(\"/\"); if (idx > 0) { ctx._source.dataset_root = src.substring(0, idx); ctx._source.dataset_subpath = src.substring(idx + 1); } else { ctx._source.dataset_root = src; } }"
    }
  }')

if [[ "${backfill_status}" != "200" ]]; then
  echo -e "${YELLOW}⚠ Backfill request returned HTTP ${backfill_status}:${NC}"
  cat /tmp/people_db_backfill_response.json
  exit 1
fi

updated=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("updated",0))' < /tmp/people_db_backfill_response.json)
failures=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d.get("failures",[])))' < /tmp/people_db_backfill_response.json)

echo -e "${GREEN}✓ Backfill complete.${NC} updated=${updated} failures=${failures}"

if [[ "${failures}" -gt 0 ]]; then
  echo -e "${YELLOW}Note: some documents failed to update. See /tmp/people_db_backfill_response.json for details.${NC}"
fi
