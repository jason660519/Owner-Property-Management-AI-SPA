#!/usr/bin/env bash
# filepath: scripts/download-taiwan-gov-documents.sh
# description: Download Taiwan government real estate / rental standard contract PDFs (地政司-定型化契約應記載及不得記載事項) to resource/Taiwan Gov documents
# created: 2026-02-05
# creator: Cursor (Auto)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST_DIR="$ROOT_DIR/resource/Taiwan Gov documents"
BASE_URL="https://www.ey.gov.tw/File"

mkdir -p "$DEST_DIR"

# PDF file IDs from 行政院 (ey.gov.tw). Format: "filename|fileid"
FILES_LIST=(
  "成屋買賣定型化契約應記載及不得記載事項.pdf|399F33D0683F2239"
  "住宅租賃定型化契約應記載及不得記載事項.pdf|43BC094940995CFC"
  "住宅轉租定型化契約應記載及不得記載事項.pdf|8886942C80253779"
  "預售屋買賣定型化契約應記載及不得記載事項.pdf|17FD66C7511F7121"
  "不動產委託銷售定型化契約應記載及不得記載事項.pdf|D34DC4826DA9A991"
  "預售停車位買賣定型化契約應記載及不得記載事項.pdf|DA40DE699A9FBE88"
)
# 租賃住宅委託管理: no static File ID; script fetches from detail page below
RENTAL_MANAGEMENT_PAGE="https://www.ey.gov.tw/Page/DFB720D019CCCB0A/19994068-fc51-4e6a-9dc5-447a8dfe6bf3"

download_one() {
  local name="$1"
  local id="$2"
  local url="${BASE_URL}/${id}?A=C"
  local path="$DEST_DIR/$name"
  if [[ -f "$path" ]]; then
    echo "[skip] $name (already exists)"
    return 0
  fi
  echo "[downloading] $name"
  if curl -sSfL --max-time 60 -o "$path" "$url"; then
    if [[ -s "$path" ]]; then
      echo "[ok] $name"
    else
      rm -f "$path"
      echo "[fail] $name (empty file)" >&2
      return 1
    fi
  else
    echo "[fail] $name ($url)" >&2
    rm -f "$path"
    return 1
  fi
}

echo "Downloading Taiwan government real estate documents to: $DEST_DIR"
for entry in "${FILES_LIST[@]}"; do
  name="${entry%%|*}"
  id="${entry##*|}"
  # Skip placeholder ID for 租賃住宅委託管理 (try page fetch below)
  if [[ "$id" == "1A3B2C4D5E6F7890" ]]; then
    continue
  fi
  download_one "$name" "$id" || true
done

# 租賃住宅委託管理: try to get PDF ID from page
RENTAL_MANAGEMENT_FILE="租賃住宅委託管理定型化契約應記載及不得記載事項.pdf"
if [[ ! -f "$DEST_DIR/$RENTAL_MANAGEMENT_FILE" ]]; then
  echo "[downloading] $RENTAL_MANAGEMENT_FILE (from page)"
  FILE_ID=$(curl -sSfL --max-time 30 "$RENTAL_MANAGEMENT_PAGE" 2>/dev/null | grep -oE 'File/[0-9A-Fa-f]+' | head -1 | sed 's/File\///') || true
  if [[ -n "$FILE_ID" ]]; then
    download_one "$RENTAL_MANAGEMENT_FILE" "$FILE_ID" || true
  fi
  if [[ ! -f "$DEST_DIR/$RENTAL_MANAGEMENT_FILE" ]]; then
    echo "[note] $RENTAL_MANAGEMENT_FILE: open $RENTAL_MANAGEMENT_PAGE and download PDF manually."
  fi
fi

echo "Done. See $DEST_DIR/README.md for other documents (不動產說明書、住宅租賃/包租應約定事項) that may require manual download from 內政部."
