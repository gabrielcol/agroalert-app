# STATUS

## Now

- Repo reset to a whitelabel foundation (`app-base`) on 2026-09-12: auth + RBAC
  (`admin` / `member` / `auditor`), audit log, users, settings, EN/RO i18n, demo `Post`
  slice. All domain features and the tablet/kiosk flow are gone.
- Verified green: `bun run typecheck`, `bun run lint`, `bunx prettier --check .`,
  `bun run test` (49 unit), `bun run test:e2e` (10 specs), `bun run build`.

## Next

- Make the first commit (the repo has no commits and no remote yet) and add a remote.
- Fill in the tracker link placeholder (`<TRACKER_URL>`) in `AGENTS.md` for the new project.
- Rename `App` / `app-base` to the real product name (see README "Renaming").
- Start adding the new project's domain on top (README "Adding a feature").

## Blocked

- Nothing.

## Gotchas

- Public sign-up is disabled; provision accounts with
  `bun run create-user <email> <password> [role] [name]`.
- The `/sign-in/email` rate limit is relaxed outside `NODE_ENV=production` so parallel
  Playwright workers can sign in from one host; production keeps better-auth's default.
- `.env` is local and gitignored; `bun run db:migrate` creates `dev.db` at the repo root.
- The `/wrap` skill fails until the repo has at least one commit (`git log` errors).
- Ops scripts (`create-user`, `set-role`) use `bun:sqlite`; port them when moving to Postgres.
