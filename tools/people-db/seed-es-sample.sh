#!/usr/bin/env bash

set -euo pipefail

ES_URL="${ES_URL:-http://127.0.0.1:9200}"
INDEX_NAME="${INDEX_NAME:-people_database}"
CSV_PATH="${CSV_PATH:-resources/samples/台北市里長/台北市里長_匯入用.csv}"
DOC_ID="${DOC_ID:-people-db-sample-taipei-chief}"
DATA_SOURCE="${DATA_SOURCE:-台北市里長樣本}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Seed one real sample document into Elasticsearch people_database index.

Usage:
  tools/people-db/seed-es-sample.sh [--es-url URL] [--index NAME] [--csv PATH] [--doc-id ID]

Options:
  --es-url URL   Elasticsearch base URL (default: http://127.0.0.1:9200)
  --index NAME   Index name (default: people_database)
  --csv PATH     Sample CSV path (default: resources/samples/台北市里長/台北市里長_匯入用.csv)
  --doc-id ID    Elasticsearch document id (default: people-db-sample-taipei-chief)
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
    --csv)
      CSV_PATH="$2"
      shift 2
      ;;
    --doc-id)
      DOC_ID="$2"
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
if ! command -v python3 >/dev/null 2>&1; then
  echo -e "${RED}Missing required command: python3${NC}"
  exit 1
fi

if [[ ! -f "$CSV_PATH" ]]; then
  echo -e "${RED}CSV not found: $CSV_PATH${NC}"
  exit 1
fi

echo -e "${BLUE}Seeding one sample into ${INDEX_NAME}${NC}"
echo "ES_URL=${ES_URL}"
echo "CSV_PATH=${CSV_PATH}"

payload="$(python3 - "$CSV_PATH" "$DOC_ID" "$DATA_SOURCE" <<'PY'
import csv
import json
import sys
from datetime import datetime, timezone

csv_path = sys.argv[1]
doc_id = sys.argv[2]
data_source = sys.argv[3]

with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    first = next(reader, None)

if not first:
    raise SystemExit("CSV has no data rows")

name = (first.get("姓名") or "").strip()
phone = (first.get("電話") or "").strip()
mobile = (first.get("行動電話") or "").strip()
address = (first.get("里辦公處地址") or "").strip()
email = (first.get("電子郵件位址") or "").strip()

if not name:
    raise SystemExit("CSV first row missing 姓名")

now = datetime.now(timezone.utc).isoformat()

doc = {
    "record_id": doc_id,
    "name": name,
    "id_number": "A123456789",
    "phone": phone or mobile or "00000000",
    "address": address or "台北市南港區",
    "organization": "南港里辦公處",
    "title_position": "里長",
    "data_source": data_source,
    "source_file_path": csv_path,
    "source_document_id": "seed-script",
    "ocr_confidence": 0.98,
    "quality_score": 0.93,
    "duplicate_flag": None,
    "created_at": now,
    "updated_at": now,
    "original_text": f"{name} {phone} {mobile} {address} {email}".strip(),
}

print(json.dumps(doc, ensure_ascii=False))
PY
)"

curl -fsS -X PUT \
  -H "Content-Type: application/json" \
  "${ES_URL}/${INDEX_NAME}/_doc/${DOC_ID}?refresh=wait_for" \
  -d "${payload}" >/dev/null

docs_count="$(curl -fsS "${ES_URL}/_cat/indices/${INDEX_NAME}?format=json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("docs.count","0") if d else "0")')"
echo -e "${GREEN}Seed completed.${NC} docs.count=${docs_count}"
echo -e "${YELLOW}Tip:${NC} run tools/people-db/check-es.sh to verify query hits."
