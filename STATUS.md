# STATUS

## Now

- Branch `feat/agroalert-design-shell`: the Claude Design prototype is implemented as public
  routes (`/`, `/plan/teren|cultura|soi|rezumat`) with prototype-level interactivity only.
  Auth is hidden (landing page + sign-in link removed; `(admin)` guard untouched). Theme
  re-tokenised to the design (Geist, ink primary, green accent); default locale is now RO (the public screens have no locale toggle, by design);
  app renamed AgroAlert. `CONTEXT.md` glossary started.
- Verified green on the branch: `bun run typecheck`, `bun run lint`, `bunx prettier --check .`,
  `bun run test` (55 unit), `bun run test:e2e` (14 specs).

## Next

- Open the PR for `feat/agroalert-design-shell`, wait ~10 min for CodeRabbit, address feedback.
- Create the tracker issue for this task and fill in `<TRACKER_URL>` in `AGENTS.md` (Linear
  MCP was not authenticated in the session that built the branch).
- Decide the real auth story for farmers (phone-number sign-in? none?) and un-hide or
  replace the better-auth flow accordingly.
- Give the wizard real data flow: carry the chosen Crop into step 3's title and the Plan
  summary, persist Sowing Plans, wire the dashboard list.
- Rename `app-base` in `package.json` / README to the product name.

## Blocked

- Tracker issue: Linear is connected but not authenticated here; run its auth flow, then
  create the issue and link it to the PR.

## Gotchas

- Public sign-up is disabled; provision accounts with
  `bun run create-user <email> <password> [role] [name]`.
- The `/sign-in/email` rate limit is relaxed outside `NODE_ENV=production` so parallel
  Playwright workers can sign in from one host; production keeps better-auth's default.
- `.env` is local and gitignored; `bun run db:migrate` creates `dev.db` at the repo root.
- The Chrome extension was not connected in this session; visual checks used a Playwright
  screenshot script instead.
- Ops scripts (`create-user`, `set-role`) use `bun:sqlite`; port them when moving to Postgres.
