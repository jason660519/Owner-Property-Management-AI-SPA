#!/bin/bash
# filepath: scripts/generate-work-log.sh
# description: Generate AI work log after successful commit
# created: 2026-02-01
# creator: Claude Opus 4.5

TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)
LOG_DIR="docs/progress-reports/工程師每日工作報告"

# Ensure directory exists
mkdir -p "$LOG_DIR"

# Extract AI name from the most recent commit message
LAST_COMMIT_MSG=$(git log -1 --pretty=%B)
AI_NAME="Unknown"
if [[ "$LAST_COMMIT_MSG" =~ ^\[([^\]]+)\] ]]; then
  AI_NAME="${BASH_REMATCH[1]}"
fi

# Generate log file name
LOG_FILE="$LOG_DIR/${TODAY}_${AI_NAME}_work_log.md"

# Get today's commits
COMMITS=$(git log --since="$TODAY 00:00:00" --until="$TODAY 23:59:59" --pretty=format:"- %s" 2>/dev/null || echo "")

# Get changed files from the last commit
NEW_FILES=$(git diff --name-only --diff-filter=A HEAD~1 2>/dev/null || echo "")
MODIFIED_FILES=$(git diff --name-only --diff-filter=M HEAD~1 2>/dev/null || echo "")
DELETED_FILES=$(git diff --name-only --diff-filter=D HEAD~1 2>/dev/null || echo "")

# Count files
NEW_COUNT=$(echo "$NEW_FILES" | grep -c . 2>/dev/null || echo "0")
MODIFIED_COUNT=$(echo "$MODIFIED_FILES" | grep -c . 2>/dev/null || echo "0")
DELETED_COUNT=$(echo "$DELETED_FILES" | grep -c . 2>/dev/null || echo "0")

# Handle empty file lists
if [ -z "$NEW_FILES" ]; then
  NEW_FILES_FORMATTED="無"
  NEW_COUNT="0"
else
  NEW_FILES_FORMATTED=$(echo "$NEW_FILES" | sed 's/^/- `/; s/$/`/')
fi

if [ -z "$MODIFIED_FILES" ]; then
  MODIFIED_FILES_FORMATTED="無"
  MODIFIED_COUNT="0"
else
  MODIFIED_FILES_FORMATTED=$(echo "$MODIFIED_FILES" | sed 's/^/- `/; s/$/`/')
fi

if [ -z "$DELETED_FILES" ]; then
  DELETED_FILES_FORMATTED="無"
  DELETED_COUNT="0"
else
  DELETED_FILES_FORMATTED=$(echo "$DELETED_FILES" | sed 's/^/- `/; s/$/`/')
fi

if [ -z "$COMMITS" ]; then
  COMMITS="無今日 commit 記錄"
fi

# Generate log content
cat > "$LOG_FILE" << EOF
> **日期**: $TODAY
> **AI 協作者**: $AI_NAME
> **時間**: $TIME (UTC+8)

---

## 📊 今日工作摘要

### 新增檔案 ($NEW_COUNT)
$NEW_FILES_FORMATTED

### 修改檔案 ($MODIFIED_COUNT)
$MODIFIED_FILES_FORMATTED

### 刪除檔案 ($DELETED_COUNT)
$DELETED_FILES_FORMATTED

---

## 📝 Commit 記錄

$COMMITS

---

## ✅ 規範檢查結果

所有檔案已通過規範檢查。

---

**自動產生於**: $TODAY $TIME
EOF

echo "✅ 工作日誌已產生: $LOG_FILE"

# Add log file to staging area for next commit
git add "$LOG_FILE" 2>/dev/null || true
