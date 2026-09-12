# agro-app — status

_Updated: 2026-09-12_

## Now

- Nothing in flight. `main` (56c1510, pushed) holds the wizard content refinements,
  the sticky header + `StickyBar`, the expanded `CONTEXT.md` glossary, ADRs 0001–0003,
  issues 0001–0006 and the hackathon materials (`docs/event/`, `resources/`).
- Verified on merged `main`: `bun run typecheck`, `bun run test` (13 files, 80 tests).
  Not run on the merged tree: `bun run lint`, `bunx prettier --check .`, e2e.
- Both feature branches were merged directly to `main` by decision (no PRs, `gh` was
  never authenticated). They still exist locally and on `origin`; delete when convenient.

## Next

1. Issue 0003 `docs/issues/0003-weather-brief-recommendation-data-model.md` — the shared
   foundation (Weather Brief + recommendation data model, Prisma schema, tRPC contracts).
   Rule 10: land this on `main` before 0004–0006 fan out.
2. Issue 0005 `docs/issues/0005-weather-brief-open-meteo-client.md` — Open-Meteo client,
   aggregation, cache (branch `feat/weather-brief-client`).
3. Issue 0004 `docs/issues/0004-field-location-teren-step.md` — geocoding, Soil Class,
   Field Profile creation on the teren step (branch `feat/field-location-teren`).
4. Issue 0006 `docs/issues/0006-crop-variety-recommendation-ai-call.md` — Claude call for
   Crop/Variety Recommendation, wire cultura and soi (branch
   `feat/crop-variety-recommendation`).
5. Before any deploy: `E2E_PORT=3100 bun run test:e2e` against a migrated `dev.db`. The
   phone-viewport sticky-bar spec in `e2e/agro.spec.ts` has never executed.

## Blocked / decisions

- `gh` is not authenticated on this machine (`gh auth login`); until it is, PRs cannot be
  opened from a session and CodeRabbit review (rule 5) is skipped.
- Farmer auth story undecided (phone-number sign-in? none?); better-auth stays hidden.
- Alert Subscription delivery deliberately left open in the glossary until a backend exists.
- `app-base` in `package.json` / README still needs renaming to the product name.

## Gotchas

- Hackathon pace: **e2e runs pre-deploy, not per PR** (AGENTS.md rule 3). Specs are still
  written per task; per-task gate is typecheck + lint + prettier + Vitest. No review
  passes; speed over polish.
- Tracker is `docs/issues/` markdown; the issue file lands on `main` before the branch.
- The sticky bar works because it is an ordinary flex child at the end of the phone column
  (`PhoneShell`), not a fixed overlay: the window scrolls, there is no inner overflow
  container. Wrapping screens in a scroll container or giving the column
  `overflow: hidden` silently breaks both sticky elements.
- `env(safe-area-inset-bottom)` is 0 unless the root layout's
  `export const viewport = { viewportFit: "cover" }` is present; it is load-bearing.
- Use `E2E_PORT=3100` for Playwright so `reuseExistingServer` cannot test a stale dev
  server on :3000.
- `ReasonList` sits inside `ChoiceCard`, which is a `<button>`: output must stay phrasing
  content (`span`/`svg`). A unit test enforces this.
- `Dictionary = typeof en`: edit `en.ts` before `ro.ts`; `reasons.caution` is
  required-or-absent per id and both dictionaries must agree.
- The summary screen shows two `Bell` icons (alerts card + subscribe card); accepted.
- Merging stacked branches into `main` conflicts on `CHANGELOG.md` and any issue file
  cherry-picked from `main`; the branch side is the superset, take it.
- Public sign-up is disabled; provision accounts with
  `bun run create-user <email> <password> [role] [name]`.
- The `/sign-in/email` rate limit is relaxed outside `NODE_ENV=production` so parallel
  Playwright workers can sign in from one host; production keeps better-auth's default.
- `.env` is local and gitignored; `bun run db:migrate` creates `dev.db` at the repo root.
- Ops scripts (`create-user`, `set-role`) use `bun:sqlite`; port them when moving to
  Postgres.
