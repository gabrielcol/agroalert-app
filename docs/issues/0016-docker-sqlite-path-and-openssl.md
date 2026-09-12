---
status: Done
branch: fix/docker-sqlite-path-and-openssl
created: 2026-09-13
---

# Docker boot fails: SQLite path unwritable, OpenSSL missing in runner

## Description

Booting the production image fails in `docker-entrypoint.sh` at `prisma migrate deploy`:

```
prisma:warn Prisma failed to detect the libssl/openssl version to use ... Defaulting to "openssl-1.1.x".
Datasource "db": SQLite database "dev.db" at "file:./dev.db"
Error: Schema engine error: SQLite database error
unable to open database file: ./dev.db
```

Two causes:

1. `DATABASE_URL` reached the container as `file:./dev.db` (the dev value in `.env`), which
   the README's own run command does through `--env-file .env`, overriding the image's
   `file:/data/app.db` default. The relative path resolves under `/app`, which the runner
   stage creates as root (`WORKDIR /app` runs before `COPY --chown`), so the `node` user
   cannot create the file. Prisma reports it as "unable to open database file".
2. The runner stage (`node:22-bookworm-slim`) never installs `openssl`; only the `deps`
   stage does. Prisma's engine falls back to a guessed OpenSSL version.

## Acceptance criteria

- [x] The runner stage installs `openssl` and `ca-certificates`.
- [x] `/app` is owned by `node` in the runner so a relative `file:` path is writable.
- [x] `docker-entrypoint.sh` resolves the SQLite path out of `DATABASE_URL` (`file:` URLs
      only; relative paths resolve against `/app`), creates its parent directory, and fails
      with a clear message naming the path and the `file:/data/app.db` fix when the
      directory is not writable, before `prisma migrate deploy` runs.
- [x] The README and the Dockerfile header no longer suggest `--env-file .env` without a
      warning that it overrides `DATABASE_URL`; the documented run command keeps the data
      on the `/data` volume.
- [x] `sh -n docker-entrypoint.sh` passes; prettier is clean. No Vitest/Playwright surface
      (config/shell only; Docker is not installed on the dev machine, so the image was not
      rebuilt here).
