#!/usr/bin/env bash

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"
KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Elastic Observability MVP smoke checker.

Usage:
  tools/observability/mvp-smoke.sh [--es-url URL] [--kibana-url URL]

Options:
  --es-url URL       Elasticsearch URL (default: http://127.0.0.1:9200)
  --kibana-url URL   Kibana URL (default: http://127.0.0.1:5601)
  -h, --help         Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url)
      ES_URL="$2"
      shift 2
      ;;
    --kibana-url)
      KIBANA_URL="$2"
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

echo -e "${BLUE}== Elastic Observability MVP Smoke ==${NC}"
echo "ES_URL=${ES_URL}"
echo "KIBANA_URL=${KIBANA_URL}"

if curl -fsS "${ES_URL}/_cluster/health" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Elasticsearch reachable${NC}"
else
  echo -e "${RED}✗ Elasticsearch unreachable${NC}"
  exit 1
fi

if curl -fsS "${KIBANA_URL}" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Kibana reachable${NC}"
else
  echo -e "${RED}✗ Kibana unreachable${NC}"
  exit 1
fi

echo -e "${BLUE}-- Container status --${NC}"
for container in web web-au superadmin elasticsearch kibana; do
  if docker ps --format '{{.Names}}' | rg -q "^${container}$"; then
    echo -e "${GREEN}✓ ${container} running${NC}"
  else
    echo -e "${YELLOW}⚠ ${container} not running${NC}"
  fi
done

echo -e "${BLUE}-- Data stream/index hints --${NC}"
if curl -fsS "${ES_URL}/_cat/indices/traces-apm*?h=index" | rg -q "traces-apm"; then
  echo -e "${GREEN}✓ APM trace indices detected${NC}"
else
  echo -e "${YELLOW}⚠ No APM trace indices yet (traces-apm*)${NC}"
fi

if curl -fsS "${ES_URL}/_cat/indices/metrics-system*?h=index" | rg -q "metrics-system"; then
  echo -e "${GREEN}✓ System metrics indices detected${NC}"
else
  echo -e "${YELLOW}⚠ No System metrics indices yet (metrics-system*)${NC}"
fi

if curl -fsS "${ES_URL}/_cat/indices/metrics-docker*?h=index" | rg -q "metrics-docker"; then
  echo -e "${GREEN}✓ Docker metrics indices detected${NC}"
else
  echo -e "${YELLOW}⚠ No Docker metrics indices yet (metrics-docker*)${NC}"
fi

if curl -fsS "${ES_URL}/_cat/indices/metrics-postgresql*?h=index" | rg -q "metrics-postgresql"; then
  echo -e "${GREEN}✓ PostgreSQL metrics indices detected${NC}"
else
  echo -e "${YELLOW}⚠ No PostgreSQL metrics indices yet (metrics-postgresql*)${NC}"
fi

if curl -fsS "${ES_URL}/_cat/indices/synthetics-*?h=index" | rg -q "synthetics-"; then
  echo -e "${GREEN}✓ Synthetics indices detected${NC}"
else
  echo -e "${YELLOW}⚠ No Synthetics indices yet (synthetics-*)${NC}"
fi

echo -e "${GREEN}MVP smoke check completed.${NC}"
