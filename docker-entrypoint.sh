#!/bin/sh
set -e

# Apply pending Prisma migrations to the configured DATABASE_URL before the app
# boots. Idempotent (safe to run on every start); disable with RUN_MIGRATIONS=0.
# Run under Node (not `bun run`) to match the app runtime; the Prisma CLI's
# migration engine talks to SQLite directly, so it does not need the adapter.
if [ "${RUN_MIGRATIONS:-1}" != "0" ]; then
  echo "> Applying database migrations (prisma migrate deploy)..."
  node node_modules/.bin/prisma migrate deploy
fi

# Hand off to the CMD (next start), replacing the shell so signals propagate.
exec "$@"
