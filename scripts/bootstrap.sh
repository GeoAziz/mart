#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker compose"
fi

echo "Waiting for LocalStack to become healthy..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"services"'; do
  sleep 1
done

echo "Running manual bootstrap (awslocal) inside LocalStack container"

$DC exec -T localstack awslocal s3 ls || true

echo "Bootstrap (manual) complete."
