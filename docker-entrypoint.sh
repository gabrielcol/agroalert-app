#!/bin/sh
set -e

# Resolve the on-disk path of a SQLite `file:` DATABASE_URL and make sure the
# app can actually write there, so a bad value fails with a readable message
# instead of Prisma's opaque "unable to open database file".
#
# Relative paths are resolved against /app: Prisma resolves `file:` URLs
# relative to the directory holding prisma.config.ts, which is /app here.
# Non-`file:` URLs (a future Postgres DSN) are left alone.
#
# ENTRYPOINT_DRY_RUN=1 prints the resolved path and exits 0 without touching
# the database — used to exercise this logic outside a container.
APP_DIR="${APP_DIR:-/app}"
DB_PATH=""

resolve_sqlite_path() {
  url="$1"
  case "$url" in
    file://*) path="${url#file://}" ;;
    file:*) path="${url#file:}" ;;
    *) return 1 ;;
  esac
  # Drop any connection-string query (e.g. ?connection_limit=1).
  path="${path%%\?*}"
  case "$path" in
    /*) ;;
    *) path="$APP_DIR/${path#./}" ;;
  esac
  printf '%s' "$path"
}

if DB_PATH="$(resolve_sqlite_path "${DATABASE_URL:-}")"; then
  DB_DIR="$(dirname "$DB_PATH")"
  mkdir -p "$DB_DIR" 2>/dev/null || true
  if [ ! -w "$DB_DIR" ]; then
    echo "ERROR: the SQLite database directory is not writable." >&2
    echo "  DATABASE_URL=${DATABASE_URL} resolves to ${DB_PATH}" >&2
    echo "  The container runs as the 'node' user, which cannot write to ${DB_DIR}." >&2
    echo "  Fix: point DATABASE_URL at a writable location — the image default is" >&2
    echo "       DATABASE_URL=file:/data/app.db with a volume mounted at /data" >&2
    echo "       (docker run -v app-base-data:/data ...). Do not pass the dev .env" >&2
    echo "       verbatim (--env-file .env): its DATABASE_URL=file:./dev.db overrides" >&2
    echo "       that default and puts the database on the container filesystem." >&2
    exit 1
  fi
  echo "> Database: ${DB_PATH}"
fi

if [ "${ENTRYPOINT_DRY_RUN:-0}" = "1" ]; then
  exit 0
fi

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
