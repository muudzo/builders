#!/bin/sh
# Apply migrations (and optionally seed demo data) before starting the API.
set -e

echo "[vaka-api] applying migrations..."
npx prisma migrate deploy

if [ "${SEED:-false}" = "true" ]; then
  echo "[vaka-api] seeding demo data..."
  npx prisma db seed || echo "[vaka-api] seed skipped/failed (continuing)"
fi

echo "[vaka-api] starting..."
exec "$@"
