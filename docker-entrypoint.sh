#!/bin/sh
set -e

DB_FILE="${DATABASE_URL#file:}"

echo "▶ SGA Platform — database: ${DB_FILE:-unknown}"

mkdir -p "$(dirname "$DB_FILE")" /app/public/uploads

# 1) Apply schema (idempotent)
echo "▶ Applying database schema..."
npx prisma db push --skip-generate

# 2) Start server
# No demo data is seeded. On first run, open http://<host>:3000/setup
# to create the Platform Manager account — the setup page locks itself
# permanently afterwards.
echo "▶ Starting Next.js on 0.0.0.0:${PORT}..."
exec npx next start -p "${PORT}" -H 0.0.0.0
