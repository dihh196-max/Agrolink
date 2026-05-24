#!/usr/bin/env bash
# AgroLink — Script de desenvolvimento local
# Uso: ./scripts/dev.sh [--seed] [--reset]
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_ENV="$ROOT/apps/api/.env"

# Cores
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[AgroLink]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Verificações ─────────────────────────────────────────────────────────────
[[ ! -f "$API_ENV" ]] && error ".env não encontrado em apps/api/.env. Copie .env.example e preencha."
source "$API_ENV"

# ── Serviços ─────────────────────────────────────────────────────────────────
info "Iniciando PostgreSQL..."
if ! pg_lsclusters | grep -q "online"; then
  pg_ctlcluster 16 main start
fi

info "Iniciando Redis..."
redis-server --daemonize yes --logfile /tmp/redis.log 2>/dev/null || true
sleep 1

# ── Banco de dados ────────────────────────────────────────────────────────────
info "Rodando migrations..."
cd "$ROOT/packages/database"
DATABASE_URL="$DATABASE_URL" npx drizzle-kit migrate --config drizzle.config.ts 2>/dev/null
cd "$ROOT"

# ── Build packages ────────────────────────────────────────────────────────────
info "Compilando @agrolink/database..."
npx tsc -p packages/database/tsconfig.json

# ── Seed ──────────────────────────────────────────────────────────────────────
if [[ "$*" == *"--seed"* ]]; then
  info "Populando banco com dados de exemplo..."
  DATABASE_URL="$DATABASE_URL" npx tsx apps/api/src/lib/seed.ts
fi

# ── Reset ─────────────────────────────────────────────────────────────────────
if [[ "$*" == *"--reset"* ]]; then
  warn "Resetando banco de dados..."
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS agrolink;" 2>/dev/null
  sudo -u postgres psql -c "CREATE DATABASE agrolink;" 2>/dev/null
  sudo -u postgres psql -d agrolink -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
  sudo -u postgres psql -d agrolink -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
  cd "$ROOT/packages/database"
  DATABASE_URL="$DATABASE_URL" npx drizzle-kit migrate --config drizzle.config.ts
  cd "$ROOT"
  DATABASE_URL="$DATABASE_URL" npx tsx apps/api/src/lib/seed.ts
fi

# ── API ───────────────────────────────────────────────────────────────────────
info "Iniciando API na porta ${PORT:-3001}..."
fuser -k "${PORT:-3001}"/tcp 2>/dev/null || true
DATABASE_URL="$DATABASE_URL" \
REDIS_URL="$REDIS_URL" \
JWT_SECRET="$JWT_SECRET" \
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
PORT="${PORT:-3001}" \
NODE_ENV=development \
  npx tsx apps/api/src/server.ts > /tmp/agrolink-api.log 2>&1 &
API_PID=$!

# ── Web ───────────────────────────────────────────────────────────────────────
info "Iniciando Web na porta 3000..."
fuser -k 3000/tcp 2>/dev/null || true
(cd apps/web && npx next dev -p 3000 > /tmp/agrolink-web.log 2>&1) &
WEB_PID=$!

# ── Aguardar ──────────────────────────────────────────────────────────────────
sleep 6
if curl -s http://localhost:${PORT:-3001}/health > /dev/null; then
  info "✅ API rodando em http://localhost:${PORT:-3001}"
else
  warn "API demorou para iniciar — verifique /tmp/agrolink-api.log"
fi
info "✅ Web rodando em http://localhost:3000"

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  AgroLink Dev Environment está no ar! 🌱 ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  API:       http://localhost:${PORT:-3001}"
echo "  Web:       http://localhost:3000"
echo "  Dashboard: http://localhost:3000/dashboard"
echo "  Health:    http://localhost:${PORT:-3001}/health"
echo ""
echo "  Logs:"
echo "    API → tail -f /tmp/agrolink-api.log"
echo "    Web → tail -f /tmp/agrolink-web.log"
echo ""
echo "  Para parar: kill $API_PID $WEB_PID"

wait
