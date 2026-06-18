#!/bin/bash

set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit 1

# Include the standard Homebrew locations when launched from Finder.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "Starting CarNextDrive from:"
echo "$PROJECT_DIR"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or could not be found."
  echo "Install Node.js 20 or newer, then double-click this file again."
  read -r -p "Press Return to close..."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed or could not be found."
  echo "Install pnpm, then double-click this file again."
  read -r -p "Press Return to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing project dependencies..."
  if ! pnpm install --frozen-lockfile; then
    echo
    echo "Dependency installation failed."
    read -r -p "Press Return to close..."
    exit 1
  fi
fi

BASE_URL="http://localhost:5000"

echo
echo "Launching CarNextDrive at $BASE_URL"
echo "Keep this Terminal window open while using the local site."
echo

if curl --silent --fail "$BASE_URL/api/ping" >/dev/null 2>&1; then
  echo "CarNextDrive is already running. Opening it now."
  open "$BASE_URL"
  exit 0
fi

if lsof -nP -iTCP:5000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 5000 is already being used by another application."
  echo "Close that application, then double-click this file again."
  read -r -p "Press Return to close..."
  exit 1
fi

pnpm dev &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1
  fi
}
trap cleanup EXIT INT TERM

READY=0
for _ in $(seq 1 60); do
  if curl --silent --fail "$BASE_URL/api/ping" >/dev/null 2>&1; then
    READY=1
    break
  fi

  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    break
  fi

  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo
  echo "CarNextDrive did not become ready. Review the errors above."
  wait "$SERVER_PID" 2>/dev/null
  read -r -p "Press Return to close..."
  exit 1
fi

echo "CarNextDrive is ready."
open "$BASE_URL"

wait "$SERVER_PID"
