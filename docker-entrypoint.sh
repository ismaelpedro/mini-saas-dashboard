#!/bin/sh
set -e

echo "→ Applying database migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "→ Seeding database..."
  npx prisma db seed || echo "⚠ Seed step failed, continuing."
fi

echo "→ Starting Next.js on port 3000..."
exec npm run start
