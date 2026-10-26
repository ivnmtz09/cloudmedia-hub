#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Estado del Proceso / Servicio ==="
if command -v systemctl >/dev/null 2>&1; then
    systemctl --user status cloudmedia-hub-backend.service --no-pager || true
fi

echo -e "\n=== Test de Conectividad HTTP ==="
curl -i -s http://localhost:3001/api/health || echo "No responde en http://localhost:3001/api/health"
