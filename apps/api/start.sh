#!/bin/sh
set -e

echo "==> Running database migrations..."
cd /app
node_modules/.bin/drizzle-kit migrate --config=packages/database/drizzle.config.ts

echo "==> Starting AgroLink API..."
exec node_modules/.bin/tsx apps/api/src/server.ts
