#!/usr/bin/env bash
# CloudMedia Hub - GitHub Repository Setup & Push Helper
set -e

echo "=== CloudMedia Hub - GitHub Setup ==="

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Inicializando repositorio Git local..."
  git init
fi

# Ensure branch is main
git branch -M main

# Check remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)

if [ -z "$REMOTE_URL" ]; then
  echo "Por favor introduce la URL del repositorio remoto de GitHub:"
  echo "(ejemplo: git@github.com:ivnmtz09/cloudmedia-hub.git o https://github.com/ivnmtz09/cloudmedia-hub.git)"
  read -r -p "Remote URL: " INPUT_URL
  if [ -n "$INPUT_URL" ]; then
    git remote add origin "$INPUT_URL"
    echo "Remote 'origin' configurado a $INPUT_URL"
  else
    echo "No se proporcionó URL remota. Abortando push."
    exit 1
  fi
else
  echo "Remote 'origin' actual: $REMOTE_URL"
fi

echo "Añadiendo archivos..."
git add .

echo "Creando commit si hay cambios pendientes..."
git commit -m "feat(core): CloudMedia Hub - Streaming Engine, RBAC, Design System & Cloud Storage" || echo "Sin cambios para commitear."

echo "Haciendo push a main..."
git push -u origin main

echo "=== Despliegue completado con éxito ==="
