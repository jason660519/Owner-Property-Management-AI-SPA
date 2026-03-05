#!/usr/bin/env bash
# ============================================
# Supabase 備份腳本（本地 / 遠端）
# ============================================
# 用途：匯出資料庫 (pg_dump) 與可選的 Storage 目錄，供定時備份或手動備份使用。
# 用法：
#   本地（依 supabase status 取得 DB URL）：
#     ./scripts/backup-supabase.sh
#   遠端（使用環境變數 DATABASE_URL）：
#     DATABASE_URL='postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres' ./scripts/backup-supabase.sh
# 排程範例（每日凌晨 2 點）：
#    0 2 * * * cd /path/to/repo && ./scripts/backup-supabase.sh
# 詳見：docs/operational-guides/PERSISTENCE_AND_BACKUP.md

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/$STAMP"
mkdir -p "$BACKUP_DIR"

# 取得 DB URL：優先使用 DATABASE_URL（遠端），否則用本地 supabase status
if [ -n "$DATABASE_URL" ]; then
  echo "[backup] Using DATABASE_URL (remote)."
  DB_URL="$DATABASE_URL"
else
  echo "[backup] Using local Supabase DB."
  if ! command -v supabase &>/dev/null; then
    echo "Error: supabase CLI not found. Install it or set DATABASE_URL for remote backup." >&2
    exit 1
  fi
  DB_URL=$(supabase status -o env 2>/dev/null | grep '^DB_URL=' | sed 's/^DB_URL=//' | tr -d '"')
  if [ -z "$DB_URL" ]; then
    echo "Error: Could not get DB_URL from 'supabase status'. Is Supabase running? Or set DATABASE_URL." >&2
    exit 1
  fi
fi

# 1. 資料庫全量匯出
echo "[backup] Dumping database to $BACKUP_DIR/database.sql ..."
pg_dump "$DB_URL" --no-owner --no-acl > "$BACKUP_DIR/database.sql"
echo "[backup] Database dump done."

# 2. 本地 Storage：若使用 supabase/storage-data，一併壓縮
STORAGE_DATA="$PROJECT_ROOT/supabase/storage-data"
if [ -d "$STORAGE_DATA" ] && [ -n "$(ls -A "$STORAGE_DATA" 2>/dev/null)" ]; then
  echo "[backup] Archiving storage-data to $BACKUP_DIR/storage.tar.gz ..."
  tar -czf "$BACKUP_DIR/storage.tar.gz" -C "$PROJECT_ROOT" supabase/storage-data
  echo "[backup] Storage archive done."
else
  echo "[backup] No storage-data or empty; skipping storage archive."
fi

# 3. 遠端 Storage：若有 Supabase project ref，可用 CLI 下載（需先 supabase login）
# 例：supabase storage download --project-ref xxx --all "$BACKUP_DIR/storage_remote"
# 此處不自動執行，避免依賴 login 狀態；有需要請手動或另寫排程。

echo "[backup] Done. Backup at: $BACKUP_DIR"
