#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Intentar iniciar via systemd user service primero
if command -v systemctl >/dev/null 2>&1 && systemctl --user status cloudmedia-hub-backend.service >/dev/null 2>&1; then
    echo "Iniciando servicio systemd cloudmedia-hub-backend.service..."
    systemctl --user start cloudmedia-hub-backend.service
    sleep 1
    systemctl --user status cloudmedia-hub-backend.service --no-pager
    exit 0
fi

# Fallback directo con nohup
PID_FILE="$DIR/server.pid"
LOG_FILE="$DIR/backend.log"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Backend ya está en ejecución (PID: $PID)."
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

PORT_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 1
fi

nohup /home/ivnmtz09/.local/bin/node src/server.js </dev/null >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"
sleep 1
echo "CloudMedia Hub Backend iniciado con PID: $NEW_PID"
