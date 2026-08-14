#!/bin/sh
set -eu
node /opt/bgutil/server/build/main.js --port 4416 &
provider_pid=$!
trap 'kill "$provider_pid" 2>/dev/null || true' EXIT INT TERM
uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
