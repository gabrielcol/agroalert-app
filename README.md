# app-base

A production-shaped **foundation to fork** for new apps. Batteries chosen once,
correctly, so each new project starts from a working full-stack skeleton:
authentication, roles, an audit trail, user management, settings, i18n and a
typed API — wired end to end.

## Stack

| Layer      | Choice                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router, React 19)                    |
| Runtime    | [Bun](https://bun.sh) for tooling; Node serves production (see Dockerfile) |
| Auth       | [better-auth](https://better-auth.com) (email/password + admin plugin)     |
| API        | [tRPC v11](https://trpc.io) + [TanStack Query](https://tanstack.com/query) |
| ORM        | [Prisma 7](https://prisma.io) (SQLite now, Postgres-ready)                 |
| UI         | [shadcn/ui](https://ui.shadcn.com) + Tailwind v4 + next-themes             |
| Validation | [Zod](https://zod.dev) + typed env (`@t3-oss/env-nextjs`)                  |
| Tooling    | ESLint · Prettier · Husky · lint-staged · Vitest · Playwright              |

## Quickstart

```bash
bun install
cp .env.example .env          # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
bun run db:migrate            # apply migrations, create dev.db
bun run db:seed               # system-config singleton
bun run create-user admin@example.com password123 admin "Admin"
bun dev                       # http://localhost:3000
```

Public sign-up is disabled by design: accounts are provisioned by an admin (the
users screen, or `bun run create-user`). Sign in, land on `/dashboard`, add a
post — that vertical slice exercises every layer (auth → tRPC protected
procedure → Prisma → shadcn UI).

## What's included

- **Auth + RBAC** — better-auth with the admin plugin. Roles live in
  `src/lib/permissions.ts` (`admin`, `member`, `auditor`; new accounts start as
  the non-privileged `pending`). `permissionProcedure` guards tRPC procedures;
  pages re-check server-side.
- **Users** (`/users`) — create (with an initial password), rename, reset
  password, deactivate/reactivate, assign roles. Admin only.
- **Audit log** (`/audit`) — append-only trail of privileged actions and
  sign-ins, with field-level before/after diffs. Admin + auditor.
- **Settings** (`/settings`) — a `SystemConfig` singleton (default locale, site
  name) edited through an audited, transactional mutation. Extend it with your
  own keys.
- **i18n** — RO (default) and EN dictionaries in `src/lib/i18n`, a persisted
  locale toggle, `useT()` hook. `en.ts` is the type source of truth.
- **Security headers** — CSP, HSTS (production), frame denial, nosniff
  (`next.config.ts`).
- **Ops scripts** — `bun run create-user`, `bun run set-role`.
- **Docker** — multi-stage image, migrations applied on boot
  (`docker-entrypoint.sh`).

## Scripts

| Command                         | What it does                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bun dev`                       | Dev server (Turbopack)                                                                               |
| `bun run build`                 | Production build (validates env)                                                                     |
| `bun run typecheck`             | `tsc --noEmit`                                                                                       |
| `bun run lint`                  | ESLint                                                                                               |
| `bun run format`                | Prettier write                                                                                       |
| `bun run test`                  | Vitest unit tests                                                                                    |
| `bun run test:e2e`              | Playwright e2e (boots the app)                                                                       |
| `bun run db:migrate`            | `prisma migrate dev`                                                                                 |
| `bun run db:seed`               | Idempotent seed                                                                                      |
| `bun run db:studio`             | Prisma Studio                                                                                        |
| `bun run create-user`           | `<email> <password> [role] [name]`                                                                   |
| `bun run set-role`              | `<email> <role>`                                                                                     |
| `bun run build:crop-dictionary` | Regenerate `src/lib/agro/crop-dictionary.compact.json` from `resources/culturi/crop-dictionary.json` |

A pre-commit hook (Husky + lint-staged) runs ESLint + Prettier on staged files.

## Project structure

```
prisma/schema.prisma      Data model (auth models + Post, AuditLog, SystemConfig,
                          FieldProfile, WeatherCell, CropRecommendation, VarietyRecommendation)
prisma/seed-data.ts       Idempotent seed logic (unit-tested)
src/
  env.ts                  Typed, validated environment variables
  lib/
    db.ts                 Prisma singleton (better-sqlite3 driver adapter)
    auth.ts               better-auth server instance (admin plugin, audit hook)
    auth-client.ts        better-auth browser client
    permissions.ts        Roles + resource/action statement (RBAC)
    audit.ts              Append-only audit writer + field diff
    rate-limit.ts         In-process fixed-window limiter for hot mutations
    i18n/                 Dictionaries, provider, useT()
    agro/                 Field Profile + recommendation contracts, compact Crop Dictionary
    weather/              Weather Brief contract (Zod) + fixture
  server/trpc/            Context, routers, protectedProcedure, permissionProcedure
  trpc/                   Transport wiring across the RSC boundary
  app/
    api/auth/[...all]     better-auth handler
    api/trpc/[trpc]       tRPC fetch adapter
    (agro)/               public AgroAlert screens (dashboard + /plan wizard), no session
    (auth)/               sign-in / sign-up (disabled notice)
    (admin)/              signed-in shell: dashboard, users, audit, settings
  components/             shadcn ui/, admin shell, auth, posts, shared
scripts/                  create-user, set-role (bun:sqlite ops helpers), build-crop-dictionary
test/, e2e/               Vitest helpers, Playwright specs
```

## Adding a feature

1. Model → add to `prisma/schema.prisma`, then `bun run db:migrate`.
2. Permissions → add the resource/actions to `appStatement` in
   `src/lib/permissions.ts` and grant them per role.
3. API → add a router under `src/server/trpc/routers/`, mount it in
   `src/server/trpc/root.ts`. Use `permissionProcedure({ resource: [action] })`
   and write an audit row inside the same transaction for state changes.
4. UI → call it from a client component with
   `const trpc = useTRPC(); useQuery(trpc.x.y.queryOptions())`, or prefetch in an
   RSC with `prefetch(trpc.x.y.queryOptions())` inside `<HydrateClient>`.
5. Strings → add keys to `src/lib/i18n/dictionaries/en.ts` (and mirror in `ro.ts`).
6. Tests → a Vitest router test (fake Prisma client via `test/trpc.ts`) and a
   Playwright spec.

## shadcn components & blocks

```bash
bunx shadcn@latest add <component>        # e.g. dialog, table, tabs
bunx shadcn@latest add dashboard-01       # free official blocks
bunx shadcn@latest add <registry-url>     # third-party / paid registries (bring your own license)
```

Official blocks are free (MIT). Paid kits (Tailwind Plus, shadcnblocks, etc.) are
third-party — install via their registry URL if you have a license. None are
bundled here.

## Switching to Postgres

SQLite is the default for zero-setup local dev. To move to Postgres:

1. `bun add @prisma/adapter-pg pg && bun add -d @types/pg`
2. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
3. In `src/lib/db.ts`, swap `PrismaBetterSqlite3` for the `@prisma/adapter-pg`
   adapter (and drop the SQLite PRAGMAs).
4. In `src/lib/auth.ts`, set `prismaAdapter(db, { provider: "postgresql" })`.
5. Point `DATABASE_URL` at your Postgres instance, then reset migrations:
   `rm -rf prisma/migrations && bun run db:migrate --name init`.
6. The ops scripts use `bun:sqlite`; port them to `pg` or use the users UI.

Because a single provider is used at a time, there is no dev/prod schema drift to
manage. Keep to portable column types until you migrate.

## Environment variables

See `.env.example`. Validated at boot by `src/env.ts` (imported in
`next.config.ts`) — a missing required var fails the build. Set
`SKIP_ENV_VALIDATION=1` to bypass in Docker/CI image builds.

To enable GitHub OAuth, set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`; the
provider is auto-enabled when both are present.

## Renaming

The visible name is one string per dictionary (`app.name` in
`src/lib/i18n/dictionaries/*.ts`) plus `<title>` in `src/app/layout.tsx`, the
`name` in `package.json`, the Docker tags in `Dockerfile`, and the locale
storage key in `src/lib/i18n/index.ts`.

## Deliberately deferred

Kept out of the lean core — add per app when needed: payments (Stripe),
transactional email (Resend), organizations/teams (better-auth plugin), file
uploads / object storage, rich text, observability (Sentry/PostHog), CI.
