#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/.claude/skills"

TARGET_DIRS=(
  "$ROOT_DIR/.agents/skills"
  "$ROOT_DIR/.codex/skills"
  "$ROOT_DIR/.cursor/skills"
  "$ROOT_DIR/.agent/skills"
  "$ROOT_DIR/.github/skills"
  "$ROOT_DIR/.opencode/skill"
)

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

for target in "${TARGET_DIRS[@]}"; do
  mkdir -p "$target"
  rsync -a "$SOURCE_DIR/" "$target/"
  echo "Synced: $target"
done

echo "Done. Skills synchronized from .claude/skills to all target platforms."
