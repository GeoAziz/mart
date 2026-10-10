#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker compose"
fi

if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
  fi
fi

PROFILE="${1:-}"
if [ -n "$PROFILE" ]; then
  $DC --profile "$PROFILE" up -d
else
  $DC up -d
fi

echo "Started mart services. App: http://localhost:3000"
