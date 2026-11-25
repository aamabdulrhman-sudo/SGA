#!/bin/sh
set -e

DB_FILE="${DATABASE_URL#file:}"
SEED_FLAG="/app/data/.seeded"

echo "▶ SGA Platform — database: ${DB_FILE:-unknown}"

mkdir -p "$(dirname "$DB_FILE")" /app/public/uploads

# 1) Apply schema (idempotent)
echo "▶ Applying database schema..."
npx prisma db push --skip-generate

# 2) Seed demo data on first run only
if [ ! -f "$SEED_FLAG" ]; then
  echo "▶ First run — seeding demo data (شركة الأفق القابضة)..."
  node prisma/dist/seed.js && touch "$SEED_FLAG"
else
  echo "▶ Demo data already seeded — skipping."
fi

# 3) Start server
echo "▶ Starting Next.js on 0.0.0.0:${PORT}..."
exec npx next start -p "${PORT}" -H 0.0.0.0
