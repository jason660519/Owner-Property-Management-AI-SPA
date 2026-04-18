#!/usr/bin/env bash
# Collect raw --help output from each Adapter CLI for docs update.
# Usage: ./scripts/collect-cli-help.sh [output_dir]
#
# Output is written to $OUTPUT_DIR/<cli_name>.help.txt
# The companion Claude command /update-cli-docs reads these files.

set -euo pipefail

OUTPUT_DIR="${1:-/tmp/cli-help-raw}"
mkdir -p "$OUTPUT_DIR"

# Define CLIs to check: <display_name> <binary> <help_flag> [subcommands...]
# Each entry produces one .help.txt file.
declare -A CLIS=(
  [claude]="claude --help"
  [codex]="codex --help"
  [cursor]="cursor --help"
  [opencode]="opencode --help"
  [gemini]="gemini --help"
  [kilo]="kilo --help"
)

# Additional subcommands to capture (deeper help pages)
declare -A SUBCMDS=(
  [claude]="claude mcp --help;claude config --help"
  [codex]="codex exec --help;codex app-server --help;codex cloud --help"
  [opencode]="opencode serve --help;opencode web --help;opencode mcp --help;opencode agent --help;opencode auth --help;opencode github --help"
  [cursor]="cursor agent --help;cursor mcp --help"
)

TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)
SUMMARY_FILE="$OUTPUT_DIR/_summary.txt"

echo "=== CLI Help Collection — $TIMESTAMP ===" > "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

collected=0
skipped=0

for name in "${!CLIS[@]}"; do
  cmd="${CLIS[$name]}"
  binary="${cmd%% *}"
  outfile="$OUTPUT_DIR/${name}.help.txt"

  if ! command -v "$binary" &>/dev/null; then
    echo "[SKIP] $name — binary '$binary' not found" | tee -a "$SUMMARY_FILE"
    echo "$name" >> "$OUTPUT_DIR/_missing.txt"
    ((skipped++))
    continue
  fi

  echo "[OK]   $name — collecting..." | tee -a "$SUMMARY_FILE"

  # Capture main help
  {
    echo "### $name --help ($(date +%Y-%m-%d))"
    echo "### binary: $(which "$binary")"
    echo "### version: $($binary --version 2>/dev/null || echo 'unknown')"
    echo ""
    eval "$cmd" 2>&1 || true
  } > "$outfile"

  # Capture subcommand help
  if [[ -n "${SUBCMDS[$name]:-}" ]]; then
    IFS=';' read -ra subs <<< "${SUBCMDS[$name]}"
    for sub in "${subs[@]}"; do
      {
        echo ""
        echo "---"
        echo "### $sub"
        echo ""
        eval "$sub" 2>&1 || true
      } >> "$outfile"
    done
  fi

  ((collected++))
done

echo "" >> "$SUMMARY_FILE"
echo "Collected: $collected  |  Skipped: $skipped  |  Total: ${#CLIS[@]}" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
echo "Output directory: $OUTPUT_DIR" >> "$SUMMARY_FILE"

echo ""
echo "=== Done ==="
cat "$SUMMARY_FILE"

# Hint for missing CLIs
if [[ -f "$OUTPUT_DIR/_missing.txt" ]]; then
  echo ""
  echo "Tip: For missing CLIs, the /update-cli-docs command can use Context7 MCP"
  echo "     to fetch documentation from official sources instead."
fi
