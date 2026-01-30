#!/bin/zsh
# Export environment variables for MCP servers
# Usage: source export-env.sh

set -a
source .env
set +a

echo "Environment variables loaded from .env"
