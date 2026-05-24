#!/bin/sh
set -e

echo "==> Running database migrations..."
cd /app/packages/database
../../node_modules/.bin/drizzle-kit migrate

echo "==> Starting AgroLink API..."
cd /app
exec node_modules/.bin/tsx apps/api/src/server.ts
