#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/server.pid"

if command -v systemctl >/dev/null 2>&1 && systemctl --user is-active --quiet cloudmedia-hub-backend.service 2>/dev/null; then
    echo "Deteniendo cloudmedia-hub-backend.service..."
    systemctl --user stop cloudmedia-hub-backend.service
    echo "Servicio detenido."
fi

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
fi

PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    kill -9 $PORT_PID 2>/dev/null || true
fi

echo "Backend detenido completamente."
