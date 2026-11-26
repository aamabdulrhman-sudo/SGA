#!/bin/sh
set -e

DB_FILE="${DATABASE_URL#file:}"

echo "▶ SGA Platform — database: ${DB_FILE:-unknown}"

mkdir -p "$(dirname "$DB_FILE")" /app/public/uploads

# 1) Apply schema (idempotent — safe for every boot/upgrade)
echo "▶ Applying database schema..."
npx prisma db push --skip-generate --accept-data-loss

# 2) Start server (no demo seeding — the setup wizard creates the manager account)
echo "▶ Starting Next.js on 0.0.0.0:${PORT}..."
exec npx next start -p "${PORT}" -H 0.0.0.0
