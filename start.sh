#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontro el archivo .env"
  echo "Copia .env.example a .env y ajusta los valores."
  exit 1
fi

echo "Exportando variables de entorno desde .env..."
set -a
source "$ENV_FILE"
set +a

COMPOSE_FILE="docker-compose.local.yml"

echo "Deteniendo contenedores existentes..."
docker compose -f "$COMPOSE_FILE" down

echo "Levantando servicios..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Estado de los contenedores:"
docker compose -f "$COMPOSE_FILE" ps
