#!/bin/bash
# Apply dev_tasks migration directly, bypassing the broken migration chain.
# This is needed when supabase migration up fails at an earlier migration.
#
# Usage: ./apply-dev-tasks-migration.sh

set -e
cd "$(dirname "$0")/../.."

SQL_FILE="supabase/migrations/20260224120000_create_dev_tasks.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: Migration file not found: $SQL_FILE"
  exit 1
fi

echo "Applying dev_tasks migration via supabase db execute..."
echo ""

# Try supabase CLI first
if command -v supabase &>/dev/null; then
  supabase db execute --file "$SQL_FILE"
  echo ""
  echo "Done! dev_tasks table is ready."
else
  echo "supabase CLI not found. Options:"
  echo ""
  echo "Option 1 - Supabase Studio SQL editor:"
  echo "  1. Open http://localhost:54323"
  echo "  2. Go to SQL Editor"
  echo "  3. Paste the contents of: $SQL_FILE"
  echo ""
  echo "Option 2 - psql direct (local Supabase):"
  echo "  psql postgresql://postgres:postgres@localhost:54322/postgres < $SQL_FILE"
  echo ""
  echo "Contents of migration:"
  echo "---"
  cat "$SQL_FILE"
fi
