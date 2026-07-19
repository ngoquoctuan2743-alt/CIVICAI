#!/usr/bin/env bash
# ==================================================
# VAIC 2026 - Deploy len VPS Linux (vd: Hostinger KVM VPS)
# Tuong duong scripts/setup.ps1 nhung danh cho Linux + dung .env.production
#
# YEU CAU TRUOC KHI CHAY:
#   1. Docker + Docker Compose v2 da cai (xem huong dan ben duoi neu chua co)
#   2. Node.js 24.x + npm da cai (chi dung de chay migration tu host)
#   3. File .env, backend/.env, ai-service/.env da duoc tao tu ban .env.production
#      va DIEN GIA TRI THAT (JWT_SECRET, DB_PASSWORD, ANTHROPIC_API_KEY, domain that)
#
# CACH DUNG:
#   cd CIVICAI
#   chmod +x scripts/deploy-vps.sh
#   ./scripts/deploy-vps.sh
# ==================================================

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/6] Kiem tra Docker..."
if ! docker version >/dev/null 2>&1; then
  echo "Docker chua chay hoac chua cai dat. Cai Docker truoc (xem ghi chu cuoi file)." >&2
  exit 1
fi

echo "==> [2/6] Kiem tra file .env production..."
for f in ".env" "backend/.env" "ai-service/.env"; do
  if [ ! -f "$f" ]; then
    echo "Thieu file $f. Chay: cp ${f%.env}.env.production $f  roi dien gia tri that." >&2
    exit 1
  fi
done

echo "==> [3/6] Build Docker image (backend, frontend, ai-service)..."
docker compose --env-file .env build

echo "==> [4/6] Khoi dong PostgreSQL va cho healthy..."
docker compose --env-file .env up -d postgres
until docker compose exec -T postgres pg_isready -U "${DB_USER:-vaic}" -d "${DB_NAME:-vaic}" >/dev/null 2>&1; do
  sleep 1
done

echo "==> [5/6] Chay migration (tu host, ket noi qua port 5433)..."
pushd backend >/dev/null
if [ ! -d node_modules ]; then
  echo "    node_modules chua co, chay npm install truoc..."
  npm install
fi
set -a
source ../.env        # nap DB_PASSWORD, JWT_SECRET... tu file .env goc production
DB_HOST=localhost DB_PORT=5433 npm run migration:run
set +a
popd >/dev/null

echo "==> [6/6] Khoi dong Backend, AI Service, Frontend, Nginx..."
docker compose --env-file .env up -d

echo ""
echo "==> Cho AI Service san sang roi nap kho tri thuc..."
AI_READY=0
for i in $(seq 1 20); do
  if curl -fsS --max-time 3 http://localhost:8000/health >/dev/null 2>&1; then
    AI_READY=1
    break
  fi
  sleep 3
done
if [ "$AI_READY" = "1" ]; then
  curl -fsS -X POST --max-time 60 http://localhost:8000/ai/ingest >/dev/null \
    && echo "    Ingest thanh cong." \
    || echo "    Canh bao: ingest that bai. Thu lai thu cong: curl -X POST http://localhost:8000/ai/ingest"
else
  echo "    Canh bao: AI Service chua san sang sau 60s. Xem: docker compose logs ai-service"
fi

echo ""
echo "==> Deploy hoan tat!"
echo "    Kiem tra: docker compose ps"
echo "    Frontend qua Nginx: http://<IP-VPS-cua-ban>  (hoac domain sau khi tro DNS)"
echo ""
echo "    LUU Y: nginx.conf hien tai CHI listen port 80 (chua co HTTPS)."
echo "    Xem huong dan bat SSL (Certbot) trong docs/DEPLOYMENT.md muc 'Production that'."

# ==================================================
# Ghi chu: Neu VPS chua cai Docker + Docker Compose v2 + Node.js 24, chay:
#
#   curl -fsSL https://get.docker.com | sudo sh
#   sudo usermod -aG docker $USER && newgrp docker
#   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
#   sudo apt-get install -y nodejs
# ==================================================
