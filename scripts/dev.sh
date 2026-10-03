#!/usr/bin/env bash
# Local static server + ngrok tunnel for testing on a phone.
#   scripts/dev.sh [port]
# Needs: npx (Node), ngrok (authenticated). The ngrok URL is public while this runs.
set -euo pipefail

PORT="${1:-18080}"
cd "$(dirname "$0")/.."

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is in use. Try: scripts/dev.sh <other-port>" >&2
  exit 1
fi

# --no-port-switching: never drift to a random port ngrok doesn't know about
npx --yes serve -l "$PORT" --no-port-switching --no-clipboard . &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT

ngrok http "$PORT"
