# syntax=docker/dockerfile:1

# Production image for the app.
#
# Stack notes (why this Dockerfile looks the way it does):
#   - Bun is the package manager / build runner (bun.lock), but the app is
#     SERVED under Node. Prisma 7's better-sqlite3 driver adapter is a native
#     N-API addon that Bun cannot dlopen (oven-sh/bun#4290), so `next start`
#     under Bun crashes on the first DB query. Node loads the same addon fine,
#     so all stages are Node-based and Bun is layered in only as a tool.
#   - better-sqlite3 is a NATIVE module: it is compiled in the `deps` stage
#     (C++ toolchain) and carried into the runtime as-is. Every stage shares the
#     same Debian base (bookworm) so the compiled binding stays ABI-compatible.
#   - Bun is still needed at runtime by the ops scripts (`bun run create-user`
#     / `set-role` import `bun:sqlite`), so the runner keeps the bun binary.
#   - The Prisma client is generated into src/generated/prisma by the
#     `postinstall` hook (prisma generate) — it is NOT vendored in git.
#   - next.config.ts imports src/env, which validates env at build/boot.
#     SKIP_ENV_VALIDATION=1 bypasses it during the build; real values are
#     supplied at runtime (see README / .env.example).
#   - DATABASE_URL is a SQLite file path: mount a volume at /data and point
#     DATABASE_URL at it (default below) so data survives container restarts.
#
# Build:  docker build -t agroplan .
# Run:    docker run -p 3030:3030 --env-file .env -v agroplan-data:/data agroplan

# Node is the runtime; Bun (single self-contained binary) is copied in as the
# package manager / build runner and for the ops scripts.
ARG NODE_IMAGE=node:22-bookworm-slim
ARG BUN_IMAGE=oven/bun:1

# ---------------------------------------------------------------------------
# deps — install all dependencies (incl. dev) with the native build toolchain.
# postinstall runs `prisma generate`, so the schema must be present.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Layer the Bun binary onto the Node base (bun is a single static-ish binary).
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder — compile the Next.js production build.
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Env is validated by next.config -> src/env; skip at build, provide at runtime.
ENV SKIP_ENV_VALIDATION=1
# Placeholder so the SQLite adapter can construct during any static analysis;
# no queries run against it. Overridden at runtime.
ENV DATABASE_URL="file:/tmp/build.db"

COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# runner — lean Node runtime carrying the built app + compiled native deps.
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next reads PORT / HOSTNAME; bind on all interfaces so the port maps out.
ENV PORT=3030
ENV HOSTNAME=0.0.0.0
# Persist the SQLite database on a mounted volume by default.
ENV DATABASE_URL="file:/data/app.db"
# Set to 0 to skip `prisma migrate deploy` on startup.
ENV RUN_MIGRATIONS=1

# Keep Bun available for the ops scripts (create-user / set-role use bun:sqlite).
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx

# Bring the fully built application (source, node_modules with the compiled
# better-sqlite3 binding, generated Prisma client, .next, prisma migrations,
# and the prisma CLI needed for `migrate deploy` on boot).
COPY --from=builder --chown=node:node /app ./
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /data && chown node:node /data

# Persist the SQLite database (and any -journal/-wal files) across restarts.
VOLUME ["/data"]

USER node
EXPOSE 3030

# Simple liveness check against the running server (Node runtime).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3030)).then(r=>process.exit(r.ok||r.status<500?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
# Serve under Node (NOT `bun run start`) so the native better-sqlite3 adapter loads.
CMD ["node", "node_modules/.bin/next", "start"]
