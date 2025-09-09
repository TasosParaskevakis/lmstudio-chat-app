#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

cleanup() {
  echo "\nShutting down..."
  if [[ -n "${SERVER_PID:-}" ]] && ps -p "$SERVER_PID" > /dev/null 2>&1; then
    kill "$SERVER_PID" || true
  fi
  if [[ -n "${WEB_PID:-}" ]] && ps -p "$WEB_PID" > /dev/null 2>&1; then
    kill "$WEB_PID" || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting server..."
(
  cd "$ROOT_DIR/server"
  if [[ ! -d node_modules ]]; then
    npm i
  fi
  npm run dev
) &
SERVER_PID=$!

sleep 1

echo "Starting web..."
(
  cd "$ROOT_DIR/web"
  if [[ ! -d node_modules ]]; then
    npm i
  fi
  # Ensure Vite React plugin exists (common issue)
  if [[ ! -d node_modules/@vitejs/plugin-react ]]; then
    npm i -D @vitejs/plugin-react
  fi
  npm run dev
) &
WEB_PID=$!

echo "Server PID: $SERVER_PID | Web PID: $WEB_PID"
echo "Open http://localhost:5173"

wait -n "$SERVER_PID" "$WEB_PID"
exit 0

