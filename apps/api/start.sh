#!/bin/sh
set -e

echo "==> Running database migrations..."
cd /app/packages/database
../../node_modules/.bin/drizzle-kit migrate

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seeding database (RUN_SEED=true)..."
  cd /app
  node_modules/.bin/tsx apps/api/src/lib/seed.ts || echo "==> Seed step finished (non-fatal)"
fi

echo "==> Starting AgroLink API..."
cd /app
exec node_modules/.bin/tsx apps/api/src/server.ts
