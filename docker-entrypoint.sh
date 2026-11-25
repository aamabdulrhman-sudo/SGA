#!/bin/sh
# SGA Platform — container entrypoint
# 1) Ensures the SQLite database schema exists (prisma db push)
# 2) Seeds demo data on first run only
# 3) Starts Next.js production server on 0.0.0.0:3000

set -e

DB_FILE="${DATABASE_URL#file:}"
SEED_FLAG="/app/data/.seeded"

echo "▶ SGA Platform — database: ${DB_FILE:-unknown}"

mkdir -p "$(dirname "$DB_FILE")" /app/public/uploads

# 1) Generate Prisma Client & Apply schema
echo "▶ Generating Prisma client & applying database schema..."
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push --skip-generate

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
