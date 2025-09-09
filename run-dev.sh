#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

find_free_port() {
  local start=${1:-3001}
  local end=${2:-3010}
  local p=$start
  while [ $p -le $end ]; do
    if ! lsof -iTCP:$p -sTCP:LISTEN -n -P >/dev/null 2>&1; then
      echo "$p"
      return 0
    fi
    p=$((p+1))
  done
  echo "$start"
  return 0
}

cleanup() {
  echo "\nShutting down..."
  # Try graceful termination of process groups first
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill -TERM -"$SERVER_PID" 2>/dev/null || true
    pkill -P "$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill -TERM -"$WEB_PID" 2>/dev/null || true
    pkill -P "$WEB_PID" 2>/dev/null || true
    kill "$WEB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

SERVER_PORT=${PORT:-3001}
if lsof -iTCP:$SERVER_PORT -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "Port $SERVER_PORT in use; attempting to terminate existing process..."
  PIDS=$(lsof -t -iTCP:$SERVER_PORT -sTCP:LISTEN -n -P || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs -I{} kill {} 2>/dev/null || true
    sleep 1
  fi
fi
echo "Using server port: $SERVER_PORT"
export PORT="$SERVER_PORT"
export CORS_ORIGIN=${CORS_ORIGIN:-*}
export VITE_API_BASE=${VITE_API_BASE:-auto}

echo "Starting server..."
(
  cd "$ROOT_DIR/server"
  if [[ ! -d node_modules ]]; then
    npm i
  fi
  PORT="$SERVER_PORT" CORS_ORIGIN="$CORS_ORIGIN" npm run dev
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
  VITE_API_BASE="${VITE_API_BASE:-auto}" npm run dev
) &
WEB_PID=$!

echo "Server PID: $SERVER_PID | Web PID: $WEB_PID"
echo "Open http://localhost:5173"

# Portable wait loop for macOS bash (no wait -n)
while true; do
  alive_server=0
  alive_web=0
  if ps -p "$SERVER_PID" > /dev/null 2>&1; then alive_server=1; fi
  if ps -p "$WEB_PID" > /dev/null 2>&1; then alive_web=1; fi
  if [[ $alive_server -eq 0 || $alive_web -eq 0 ]]; then
    break
  fi
  sleep 1
done

exit 0
