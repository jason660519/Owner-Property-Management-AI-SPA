#!/usr/bin/env bash

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"
INDEX_NAME="${INDEX_NAME:-people_database}"
TEST_QUERY="${TEST_QUERY:-闕貴卿 南港里 研究院路}"
TEST_ID_NUMBER="${TEST_ID_NUMBER:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  cat <<'EOF'
People DB Elasticsearch smoke checker

Usage:
  tools/people-db/check-es.sh [--es-url URL] [--index NAME] [--query TEXT] [--id-number VALUE]

Options:
  --es-url URL       Elasticsearch base URL (default: http://127.0.0.1:9200)
  --index NAME       Index name (default: people_database)
  --query TEXT       Multi-match test query (default: 闕貴卿 南港里 研究院路)
  --id-number VALUE  Optional exact term query for id_number
  -h, --help         Show this help
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
    --query)
      TEST_QUERY="$2"
      shift 2
      ;;
    --id-number)
      TEST_ID_NUMBER="$2"
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

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}Missing required command: $1${NC}"
    exit 1
  fi
}

require_command curl
require_command python3

echo -e "${BLUE}== People DB Elasticsearch smoke check ==${NC}"
echo "ES_URL=${ES_URL}"
echo "INDEX_NAME=${INDEX_NAME}"

health_json="$(curl -fsS "${ES_URL}/_cluster/health")"
health_status="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("status","unknown"))' <<< "${health_json}")"
echo -e "${GREEN}✓ Cluster reachable${NC} (status=${health_status})"
if [[ "${health_status}" == "red" ]]; then
  echo -e "${RED}Cluster health is red${NC}"
  exit 1
fi

plugins_txt="$(curl -fsS "${ES_URL}/_cat/plugins?v")"
if ! grep -q "analysis-ik" <<< "${plugins_txt}"; then
  echo -e "${RED}analysis-ik plugin missing${NC}"
  exit 1
fi
if ! grep -q "analysis-stconvert" <<< "${plugins_txt}"; then
  echo -e "${RED}analysis-stconvert plugin missing${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Required plugins detected${NC}"

indices_json="$(curl -sS "${ES_URL}/_cat/indices/${INDEX_NAME}?format=json")"
index_count="$(python3 -c 'import json,sys; data=json.load(sys.stdin); print(len(data) if isinstance(data,list) else 0)' <<< "${indices_json}")"
if [[ "${index_count}" -eq 0 ]]; then
  echo -e "${RED}Index not found: ${INDEX_NAME}${NC}"
  echo -e "${YELLOW}Hint: run one people-db search/import flow first so the backend initializes index mapping.${NC}"
  exit 1
fi
docs_count="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("docs.count","0"))' <<< "${indices_json}")"
echo -e "${GREEN}✓ Index exists${NC} (docs.count=${docs_count})"

mapping_json="$(curl -fsS "${ES_URL}/${INDEX_NAME}/_mapping")"
python3 -c '
import json
import sys

index_name = sys.argv[1]
doc = json.load(sys.stdin)
props = doc[index_name]["mappings"]["properties"]

assert props["name"]["type"] == "text"
assert props["id_number"]["type"] == "keyword"
assert props["phone"]["type"] == "keyword"
assert props["address"]["type"] == "text"
assert props["data_source"]["type"] == "keyword"

print("✓ Mapping core fields are valid")
' "$INDEX_NAME" <<< "${mapping_json}"

sample_json="$(curl -fsS -X GET "${ES_URL}/${INDEX_NAME}/_search" -H "Content-Type: application/json" -d '{"size":1,"sort":[{"created_at":"desc"}]}')"
sample_hits="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("hits",{}).get("total",{}).get("value",0))' <<< "${sample_json}")"
echo -e "${GREEN}✓ Sample search executed${NC} (total_hits=${sample_hits})"

query_payload="$(python3 -c '
import json
import sys
query = sys.argv[1]
print(json.dumps({
  "query": {
    "multi_match": {
      "query": query,
      "fields": ["name^2", "address", "organization", "phone"]
    }
  },
  "size": 5
}))
' "$TEST_QUERY")"

query_json="$(curl -fsS -X GET "${ES_URL}/${INDEX_NAME}/_search" -H "Content-Type: application/json" -d "${query_payload}")"
query_hits="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("hits",{}).get("total",{}).get("value",0))' <<< "${query_json}")"
if [[ "${query_hits}" -eq 0 ]]; then
  echo -e "${YELLOW}⚠ Multi-match query returned 0 hits: ${TEST_QUERY}${NC}"
else
  echo -e "${GREEN}✓ Multi-match query returned hits${NC} (hits=${query_hits})"
fi

if [[ -n "${TEST_ID_NUMBER}" ]]; then
  term_payload="$(python3 -c '
import json
import sys
print(json.dumps({"query": {"term": {"id_number": sys.argv[1]}}, "size": 5}))
' "$TEST_ID_NUMBER")"
  term_json="$(curl -fsS -X GET "${ES_URL}/${INDEX_NAME}/_search" -H "Content-Type: application/json" -d "${term_payload}")"
  term_hits="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("hits",{}).get("total",{}).get("value",0))' <<< "${term_json}")"
  if [[ "${term_hits}" -eq 0 ]]; then
    echo -e "${RED}Exact id_number term query returned 0 hits: ${TEST_ID_NUMBER}${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Exact id_number term query matched${NC} (hits=${term_hits})"
fi

echo -e "${GREEN}Smoke check completed.${NC}"
