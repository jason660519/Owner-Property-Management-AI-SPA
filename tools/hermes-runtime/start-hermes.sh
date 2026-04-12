#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERMES_HOME_DIR="${HERMES_HOME_DIR:-$HOME/.hermes-opm}"

bash "$SCRIPT_DIR/bootstrap-env.sh"

cd "$SCRIPT_DIR"
HERMES_HOME_DIR="$HERMES_HOME_DIR" docker compose pull
HERMES_HOME_DIR="$HERMES_HOME_DIR" docker compose up -d

docker compose logs --tail=80 hermes
