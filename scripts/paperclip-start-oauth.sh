#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/docker/paperclip/.env.paperclip"
COMPOSE_FILE="$ROOT_DIR/docker/paperclip/docker-compose.paperclip.yml"
CONTAINER_NAME="paperclip-paperclip-1"
DEFAULT_DATA_DIR="$HOME/.paperclip-data-owner-property-management"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[error] missing env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "[error] missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker is not installed" >&2
  exit 1
fi

echo "[info] recreating paperclip service with OAuth-first runtime"
(
  cd "$ROOT_DIR"
  ANTHROPIC_API_KEY= docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --force-recreate paperclip
)

echo "[info] runtime check inside container"
docker exec "$CONTAINER_NAME" sh -lc 'claude auth status'
docker exec "$CONTAINER_NAME" sh -lc 'claude --print "Respond with hello." --output-format text'

PAPERCLIP_DATA_DIR="$(grep '^PAPERCLIP_DATA_DIR=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
PAPERCLIP_DATA_DIR="${PAPERCLIP_DATA_DIR:-$DEFAULT_DATA_DIR}"
HEALTH_DIR="$PAPERCLIP_DATA_DIR/health"
FIXPOINT_FILE="$HEALTH_DIR/last-oauth-fixpoint.txt"
mkdir -p "$HEALTH_DIR"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$FIXPOINT_FILE"

echo "[ok] paperclip OAuth startup completed"
echo "[info] fixpoint recorded: $FIXPOINT_FILE"
