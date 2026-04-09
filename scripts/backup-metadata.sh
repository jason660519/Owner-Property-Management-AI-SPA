#!/bin/bash
# scripts/backup-metadata.sh
# Dumps property_photos, property_documents, storage.objects to a timestamped JSON file.
# Usage: ./scripts/backup-metadata.sh [trigger] [local_device_path]
#   trigger: manual | auto_stop | auto_schedule (default: manual)
#   local_device_path: optional extra copy destination

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/apps/superadmin/backups"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TRIGGER="${1:-manual}"
LOCAL_DEVICE_PATH="${2:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

mkdir -p "$BACKUP_DIR"

# Check DB is reachable
if ! psql "$DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}❌ 無法連線到 Supabase DB，備份中止${NC}"
  exit 1
fi

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.json"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo -e "${BLUE}📦 備份資料中 (trigger: $TRIGGER)...${NC}"

# Export each table as JSON to temp files
psql "$DB_URL" -t -A -c \
  "SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, property_id, storage_path, is_primary, photo_type, sort_order, created_at FROM property_photos ORDER BY created_at) t;" \
  > "$TMP_DIR/photos.json" 2>/dev/null || echo '[]' > "$TMP_DIR/photos.json"

psql "$DB_URL" -t -A -c \
  "SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, property_id, document_type, document_name, file_path, tags, is_active, created_at FROM property_documents ORDER BY created_at) t;" \
  > "$TMP_DIR/docs.json" 2>/dev/null || echo '[]' > "$TMP_DIR/docs.json"

psql "$DB_URL" -t -A -c \
  "SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT id, bucket_id, name, metadata, version, level, created_at FROM storage.objects WHERE bucket_id IN ('property-photos','property-documents') ORDER BY created_at) t;" \
  > "$TMP_DIR/storage.json" 2>/dev/null || echo '[]' > "$TMP_DIR/storage.json"

# Merge into single backup JSON using Python (reads from temp files, no var interpolation issues)
python3 - "$TMP_DIR" "$BACKUP_FILE" "$TRIGGER" <<'PYEOF'
import json, sys
from datetime import datetime, timezone

tmp_dir, out_file, trigger = sys.argv[1], sys.argv[2], sys.argv[3]

def load(name):
    try:
        with open(f"{tmp_dir}/{name}", "r") as f:
            return json.load(f)
    except Exception:
        return []

photos = load("photos.json")
docs   = load("docs.json")
storage = load("storage.json")

backup = {
    "version": "1.0",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "trigger": trigger,
    "stats": {
        "property_photos": len(photos),
        "property_documents": len(docs),
        "storage_objects": len(storage),
    },
    "data": {
        "property_photos": photos,
        "property_documents": docs,
        "storage_objects": storage,
    }
}

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(backup, f, ensure_ascii=False, default=str)

print(f"photos={len(photos)} docs={len(docs)} storage={len(storage)}")
PYEOF

# Read counts from the output
RESULT=$(python3 - "$TMP_DIR" <<'PYEOF'
import json, sys
tmp_dir = sys.argv[1]
def count(name):
    try:
        with open(f"{tmp_dir}/{name}") as f:
            return len(json.load(f))
    except: return 0
print(f"{count('photos.json')} {count('docs.json')} {count('storage.json')}")
PYEOF
)
read -r PHOTOS_COUNT DOCS_COUNT STORAGE_COUNT <<< "$RESULT"

echo -e "${GREEN}✅ 備份完成：backup_${TIMESTAMP}.json${NC}"
echo -e "   • property_photos:    ${PHOTOS_COUNT} 筆"
echo -e "   • property_documents: ${DOCS_COUNT} 筆"
echo -e "   • storage.objects:    ${STORAGE_COUNT} 筆"

# Copy to local device if configured
if [ -n "$LOCAL_DEVICE_PATH" ] && [ -d "$LOCAL_DEVICE_PATH" ]; then
  cp "$BACKUP_FILE" "$LOCAL_DEVICE_PATH/backup_${TIMESTAMP}.json"
  echo -e "${GREEN}✅ 已同步備份至本地設備：$LOCAL_DEVICE_PATH${NC}"
elif [ -n "$LOCAL_DEVICE_PATH" ]; then
  echo -e "${YELLOW}⚠️  本地設備路徑不存在，跳過：$LOCAL_DEVICE_PATH${NC}"
fi

# Retention: keep only latest 30 backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 30 ]; then
  REMOVE_COUNT=$((BACKUP_COUNT - 30))
  ls -1t "$BACKUP_DIR"/backup_*.json | tail -n "$REMOVE_COUNT" | xargs rm -f
  echo -e "${YELLOW}🗑  已清除 ${REMOVE_COUNT} 個舊備份（保留最新 30 個）${NC}"
fi

echo "$BACKUP_FILE"
