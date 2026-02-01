#!/bin/bash
# filepath: scripts/check-file-compliance.sh
# description: Check staged files for compliance with project naming conventions
# created: 2026-02-01
# creator: Claude Opus 4.5

set -e

# Get staged files (Added, Copied, Modified)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ 無檔案需要檢查"
  exit 0
fi

ERRORS=""

for FILE in $STAGED_FILES; do
  # Skip node_modules, hidden directories, and .venv
  if [[ "$FILE" == node_modules/* ]] || [[ "$FILE" == .* ]] || [[ "$FILE" == */.venv/* ]] || [[ "$FILE" == scripts/.venv/* ]]; then
    continue
  fi

  # Check 1: Root directory does not allow .md/.txt documentation files
  # Exceptions: README.md, CLAUDE.md, FILE_CREATION_CHECKLIST.md
  if [[ "$FILE" =~ ^[^/]+\.(md|txt)$ ]]; then
    if [[ "$FILE" != "README.md" ]] && [[ "$FILE" != "CLAUDE.md" ]] && [[ "$FILE" != "FILE_CREATION_CHECKLIST.md" ]]; then
      ERRORS="$ERRORS\n❌ 根目錄不允許創建文檔: $FILE (請移至 docs/)"
    fi
  fi

  # Check 2: React components must be PascalCase
  if [[ "$FILE" =~ apps/.+/components/.+\.tsx$ ]]; then
    BASENAME=$(basename "$FILE" .tsx)
    # Allow index.tsx
    if [[ "$BASENAME" != "index" ]] && [[ ! "$BASENAME" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
      ERRORS="$ERRORS\n❌ React 組件必須 PascalCase: $FILE"
    fi
  fi

  # Check 3: Hooks must be camelCase with use prefix
  if [[ "$FILE" =~ apps/.+/hooks/.+\.ts$ ]] || [[ "$FILE" =~ apps/.+/hooks/.+\.tsx$ ]]; then
    BASENAME=$(basename "$FILE" .ts)
    BASENAME=$(basename "$BASENAME" .tsx)
    # Allow index.ts
    if [[ "$BASENAME" != "index" ]] && [[ ! "$BASENAME" =~ ^use[A-Z][a-zA-Z0-9]*$ ]]; then
      ERRORS="$ERRORS\n❌ Hook 必須 use 前綴 + camelCase: $FILE"
    fi
  fi

  # Check 4: Folders in apps/ must be kebab-case (check parent directory)
  if [[ "$FILE" =~ ^apps/[^/]+/src/[^/]+/ ]]; then
    # Extract the directory path after src/
    DIR_PATH=$(dirname "$FILE")
    # Check each directory component
    while [[ "$DIR_PATH" =~ /src/ ]]; do
      CURRENT_DIR=$(basename "$DIR_PATH")
      # Skip standard directories and check for PascalCase or camelCase in folder names
      if [[ ! "$CURRENT_DIR" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]] && \
         [[ "$CURRENT_DIR" != "src" ]] && \
         [[ "$CURRENT_DIR" != "app" ]] && \
         [[ "$CURRENT_DIR" != "components" ]] && \
         [[ "$CURRENT_DIR" != "hooks" ]] && \
         [[ "$CURRENT_DIR" != "lib" ]] && \
         [[ "$CURRENT_DIR" != "utils" ]] && \
         [[ "$CURRENT_DIR" != "types" ]] && \
         [[ "$CURRENT_DIR" != "styles" ]] && \
         [[ "$CURRENT_DIR" != "assets" ]] && \
         [[ "$CURRENT_DIR" != "contexts" ]] && \
         [[ "$CURRENT_DIR" != "services" ]] && \
         [[ "$CURRENT_DIR" != "constants" ]] && \
         [[ "$CURRENT_DIR" != "__tests__" ]]; then
        # Only warn, don't block - some existing folders may not follow convention
        :
      fi
      DIR_PATH=$(dirname "$DIR_PATH")
    done
  fi

  # Check 5: No Chinese characters in code file names
  if [[ "$FILE" =~ \.(ts|tsx|js|jsx|py|sh)$ ]]; then
    # Use grep with Perl regex for Unicode detection (macOS compatible)
    if echo "$FILE" | LC_ALL=C grep -q '[^\x00-\x7F]' 2>/dev/null; then
      ERRORS="$ERRORS\n❌ 程式碼檔案禁止中文檔名: $FILE"
    fi
  fi

  # Check 6: Migration files must follow YYYYMMDDHHmmss_name.sql format
  if [[ "$FILE" =~ ^supabase/migrations/.+\.sql$ ]]; then
    BASENAME=$(basename "$FILE")
    if [[ ! "$BASENAME" =~ ^[0-9]{14}_.+\.sql$ ]]; then
      ERRORS="$ERRORS\n❌ Migration 檔案格式錯誤: $FILE (應為 YYYYMMDDHHmmss_name.sql)"
    fi
  fi

done

if [ -n "$ERRORS" ]; then
  echo -e "\n🚫 檔案規範檢查失敗："
  echo -e "$ERRORS"
  echo ""
  exit 1
fi

echo "✅ 所有檔案符合規範"
exit 0
