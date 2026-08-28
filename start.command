#!/bin/bash
# Double-clickable launcher for macOS / Linux
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install it from https://nodejs.org (v22 or newer)."
  exit 1
fi

export PORT="${PORT:-8030}"
echo "Starting Guobiao Mahjong on port $PORT ..."
echo "Open http://localhost:$PORT/  (Ctrl+C to stop)"
exec node server.js
