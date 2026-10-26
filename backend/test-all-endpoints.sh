#!/usr/bin/env bash
#
# Suite de pruebas automatizadas para CloudMedia Hub Backend
#

set -u

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

test_endpoint() {
    local name="$1"
    local command="$2"
    local expected="$3"

    echo -n "Probando: $name ... "
    output=$(eval "$command" 2>&1 || true)

    if echo "$output" | grep -q "$expected"; then
        echo "✅ OK"
        ((PASSED++))
    else
        echo "❌ FALLÓ"
        echo "   Salida obtenida: $output"
        echo "   Se esperaba: $expected"
        ((FAILED++))
    fi
}

echo "================================================="
echo " EJECUTANDO TESTS DE CLOUDMEDIA HUB BACKEND"
echo "================================================="

# 1. Health check
test_endpoint "GET /api/health" \
    "curl -s $BASE_URL/api/health" \
    '"status":"ok"'

# 2. Stats
test_endpoint "GET /api/stats" \
    "curl -s $BASE_URL/api/stats" \
    '"localDisk"'

# 3. Files listing
test_endpoint "GET /api/files (raíz)" \
    "curl -s $BASE_URL/api/files" \
    '"Peliculas"'

test_endpoint "GET /api/files (Peliculas)" \
    "curl -s '$BASE_URL/api/files?path=Peliculas'" \
    'Justice League'

# 4. Folder creation & deletion
test_endpoint "POST /api/files/folder" \
    "curl -s -X POST $BASE_URL/api/files/folder -H 'Content-Type: application/json' -d '{\"path\":\"Backups_PC/TestDir_$(date +%s)\"}'" \
    '"success":true'

# 5. Media info
test_endpoint "GET /api/media-info (o /api/stream/media-info)" \
    "curl -s '$BASE_URL/api/media-info?path=Peliculas/Justice%20League%20The%20Flashpoint%20Paradox%20HD%20698.20%20MB.mkv'" \
    '"audioTracks"'

# 6. Thumbnail generation & cache
test_endpoint "GET /api/thumbnail" \
    "curl -s -I '$BASE_URL/api/thumbnail?path=Peliculas/Justice%20League%20The%20Flashpoint%20Paradox%20HD%20698.20%20MB.mkv'" \
    'image/jpeg'

# 7. Video streaming with HTTP 206 Partial Content (Range)
test_endpoint "GET /api/stream (Range bytes=0-100)" \
    "curl -s -i -H 'Range: bytes=0-100' '$BASE_URL/api/stream?path=/home/ivnmtz09/V%C3%ADdeos/iot-fase2.mp4' | head -n 10" \
    '206 Partial Content'

# 8. Video streaming on-the-fly remuxing
test_endpoint "GET /api/stream (Remuxing)" \
    "curl -s '$BASE_URL/api/stream?path=Peliculas/Justice%20League%20The%20Flashpoint%20Paradox%20HD%20698.20%20MB.mkv&audioTrack=0' | head -c 1000 | wc -c" \
    '1000'

# 9. Cleanup scanner
test_endpoint "GET /api/cleanup" \
    "curl -s $BASE_URL/api/cleanup" \
    '"files"'

echo "================================================="
echo " RESULTADOS: $PASSED pasados, $FAILED fallados"
echo "================================================="

if [ "$FAILED" -eq 0 ]; then
    echo "¡Todos los endpoints están funcionando al 100%!"
    exit 0
else
    exit 1
fi
