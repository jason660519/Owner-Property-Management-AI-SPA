#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"
EPR_URL="${EPR_URL:-https://epr.elastic.co}"
KIBANA_CONTAINER="${KIBANA_CONTAINER:-kibana}"

usage() {
  cat <<'EOF'
Check Fleet package registry reachability for local Kibana.

Usage:
  tools/observability/check-fleet-registry.sh [--kibana-url URL] [--epr-url URL] [--container NAME]

Options:
  --kibana-url URL   Kibana base URL (default: http://127.0.0.1:5601)
  --epr-url URL      Elastic Package Registry URL (default: https://epr.elastic.co)
  --container NAME   Kibana container name (default: kibana)
  -h, --help         Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --kibana-url)
      KIBANA_URL="$2"
      shift 2
      ;;
    --epr-url)
      EPR_URL="$2"
      shift 2
      ;;
    --container)
      KIBANA_CONTAINER="$2"
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

echo -e "${BLUE}== Fleet Registry Connectivity Check ==${NC}"
echo "KIBANA_URL=${KIBANA_URL}"
echo "EPR_URL=${EPR_URL}"
echo "KIBANA_CONTAINER=${KIBANA_CONTAINER}"

if ! curl -fsS "${KIBANA_URL}" >/dev/null 2>&1; then
  echo -e "${RED}✗ Kibana is unreachable at ${KIBANA_URL}${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Kibana endpoint reachable${NC}"

if curl -fsS "${EPR_URL}" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Host can reach Elastic Package Registry${NC}"
else
  echo -e "${YELLOW}⚠ Host cannot reach ${EPR_URL}${NC}"
fi

if docker ps --format '{{.Names}}' | rg -q "^${KIBANA_CONTAINER}$"; then
  if docker exec "${KIBANA_CONTAINER}" sh -lc "curl -fsS '${EPR_URL}' >/dev/null 2>&1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Kibana container can reach Elastic Package Registry${NC}"
  else
    echo -e "${YELLOW}⚠ Kibana container cannot reach ${EPR_URL}${NC}"
    echo -e "${YELLOW}  建議：檢查 Docker DNS/Proxy 或改用 air-gapped registry${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Kibana container '${KIBANA_CONTAINER}' is not running${NC}"
fi

fleet_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -H 'kbn-xsrf: true' "${KIBANA_URL}/api/fleet/epm/packages?perPage=1" || true)"
if [[ "$fleet_status_code" == "200" || "$fleet_status_code" == "400" || "$fleet_status_code" == "401" || "$fleet_status_code" == "403" ]]; then
  echo -e "${GREEN}✓ Fleet API endpoint reachable (/api/fleet/epm/packages, status=${fleet_status_code})${NC}"
else
  echo -e "${YELLOW}⚠ Fleet API endpoint check failed (status=${fleet_status_code:-n/a})${NC}"
  echo -e "${YELLOW}  可手動檢查 Integration 頁面是否仍顯示 registry 連線警示${NC}"
fi

echo -e "${GREEN}Fleet registry check completed.${NC}"
