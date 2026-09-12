# agro-app — status

_Updated: 2026-09-13_

## Now

- Issue 0013 (log every AI call: raw response, model, input/output/cache tokens as
  separate columns, failures included, rows linked to the recommendation they produced)
  is **In Review** on `feat/ai-call-log` (83acd94, pushed; not merged). New Prisma model
  `AiCall` (`ai_call`), migration `20260912215822_ai_call_log`, `src/lib/ai/call-log.ts`.
  Gate green: typecheck, lint, prettier, Vitest (46 files / 298 tests). Playwright spec
  written, not run. Merge with `git merge --no-ff feat/ai-call-log`, then run
  `bun run db:migrate` on any other local DB. The migration was applied to `dev.db` via
  `sqlite3` because a DB IDE held the file locked; `prisma migrate status` is clean.
- Issue 0012 (dashboard hydration mismatch: `prefetch` was not awaited, so the server
  rendered the "Loading…" branch while the client hydrated with data) is **Done**: merged
  into local `main` (c3c74fe, **not pushed**) from `fix/dashboard-hydration-mismatch`.
  `prefetch()` now returns its promise and the dashboard, audit and users pages await it.
  Gate green: typecheck, lint, prettier, Vitest (290 tests). `e2e/dashboard.spec.ts` now
  fails on any "Hydration" page error but Playwright has not been run since.
- Known e2e noise: `e2e/teren.spec.ts` stubs `recommendation.crops` with `{ id,
fieldProfileId }` and no `result`, so the cultura step throws `Cannot read properties of
undefined (reading 'top')` in the browser after the redirect. The spec still passes;
  fix by reusing `CROP_RECOMMENDATION` from `e2e/recommendation-mocks.ts`.
- Issue 0011 (loading screen: every step driven by a real call, single fading step) is
  **Done**: merged into local `main` (34df534, **not pushed**) from
  `feat/loading-screen-real-steps`. Gate green: typecheck, lint, prettier, Vitest
  (44 files / 289 tests). New `weather.climate` / `weather.forecast` tRPC queries refresh
  one cache slice each. Playwright ran after the merge: 25 passed once the wizard spec's
  missing `weather.*` mocks were added (`fix/e2e-wizard-weather-mocks`, merged as 6ffcd88).
  `main` is pushed to origin.
- Issue 0009 (forecast trailing-null days past the Open-Meteo horizon) is **Done**: merged
  into local `main` (1759157, **not pushed**). Gate green: typecheck, lint, prettier, Vitest
  (44 files / 279 tests). Playwright not extended. The tRPC route now logs the error cause
  chain, and `weather_cell` finally has rows.
- Issue 0008 (Crop Calendar timeline + Sowing Date) is **Done**: merged into local `main`
  (a7424bf, **not pushed**) from `feat/crop-calendar-timeline`. Gate green on the branch:
  typecheck, lint, prettier, Vitest (44 files / 274 tests). Playwright specs were written
  but not run (pre-deploy only).
- The AI leg has never run for real: no `ANTHROPIC_API_KEY` in any local `.env`. Add one,
  walk `/plan/teren` → cultura → soi once, and record the result in
  `docs/issues/0007-weather-brief-integration.md` (it says "pending a key").
- `main` (5cb257a, local only, **not pushed**) holds issues 0003–0007 merged. Verified on
  merged `main` after 0006: typecheck, lint, Vitest green. After 0007: the integration
  worktree ran typecheck, lint, prettier, Vitest (38 files / 233 tests) and Playwright
  (24 passed) on its branch; not re-run on the final merge commit.
- Worktrees under `.claude/worktrees/` (four, one per supervisor) still exist; their
  branches are pushed. Remove with `git worktree remove <path>` when convenient.

## Next

1. Push `main`; open PRs for `feat/field-location-teren`, `feat/weather-brief-client`,
   `feat/crop-variety-recommendation`, `feat/weather-brief-integration` (issues 0004–0007
   are In Review) once `gh auth login` is done, then mark them Done.
2. Foundation follow-up: `WeatherCell` has no Current Season column; it rides inside the
   `forecast` JSON column (`src/lib/weather/brief.ts`). Add a column + migration.
3. Rezumat step follow-up: the "when to sow" window box is still static copy; show the
   recommendation's real Sowing Window. Undo / backdating of the Sowing Date is out of
   scope of 0008.
4. Rename `app-base` in `package.json` / README to the product name.

## Blocked / decisions

- `gh` is not authenticated on this machine (`gh auth login`); PRs and CodeRabbit (rule 5)
  are skipped until then. Feature branches were merged to local `main` by decision.
- The auto-mode classifier blocks `git merge` and edits to `.claude/settings*.json` from
  the agent; the user runs merges with `! git merge ...`. A
  `"Bash(git merge:*)"` allow rule in `.claude/settings.local.json` would lift it.
- Open-Meteo free tier (non-commercial, CC BY 4.0) with no attribution in the UI, by
  decision for the hackathon (ADR 0003).
- Geocoding takes the first match silently; no reverse geocoding exists on Open-Meteo, so
  a geolocated profile stores `villageName = "Locația curentă"`.
- Farmer auth story undecided (phone-number sign-in? none?); better-auth stays hidden.
- Alerts are on for every Sowing Plan (no subscription step); delivery is still undecided.
- Sowing Plans are per browser (`localStorage` ids) until the farmer auth story is decided.

## Gotchas

- Open-Meteo's forecast horizon is UTC-anchored: with `timezone=Europe/Bucharest` and
  `forecast_days=16`, the 16th local day is all-null between local midnight and ~03:00.
  `buildForecast` drops trailing null days (min 7, max 16); `forecastSchema.days` is a
  range, not `.length(16)`. Asking for 17 days does not help.
- `AI_MODEL` must be a Sonnet- or Opus-class id: the recommendation forces `tool_choice`,
  which Fable/Mythos ids reject with 400. Default is `claude-sonnet-5`.
- `ANTHROPIC_API_KEY` is optional at boot (so `bun dev` and Playwright start without it)
  and required at recommendation time; the error surfaces as the retry screen.
- Archive calls use Open-Meteo's default model blend (`ERA5-Land/ERA5`):
  `models=era5_land` alone returns null precipitation and ET0 for every day.
- An uncached ten-year archive pull costs ~260 free-tier call-equivalents; the
  `WeatherCell` cache (0.1° cell, Climate Profile 30 days, forecast/outlook 6 h) is
  load-bearing, not an optimisation.
- `next.config.ts` must keep `Permissions-Policy: geolocation=(self)`; `geolocation=()`
  silently disabled the locate button in every browser.
- Playwright `getByRole("alert")` is ambiguous: Next's route announcer is also
  `role=alert`; target `[role="alert"][data-slot="alert"]`.
- The wizard URL contract: `/plan/cultura?profile=<id>` →
  `/plan/soi?profile&rec&crop` → `/plan/rezumat?profile&rec&crop&variety`
  (`wizardPath()` in `src/lib/agro/recommendation-ui.ts`). Missing params redirect back.
- `recommendation.crops` / `.varieties` are idempotent per profile / per (rec, crop):
  refreshing a step never re-calls Claude.
- There are two `WeatherUnavailableError` classes (weather module and AI module); the
  seam in `src/lib/ai/service.ts` maps one to the other explicitly. Don't `instanceof`
  the wrong one.
- lint-staged uses the shared git stash for backups during commits; if a commit aborts,
  check `git stash list`.
- Parallel branches only ever conflicted on `CHANGELOG.md`: keep both entries, newest
  first.
- Hackathon pace: **e2e runs pre-deploy, not per PR** (AGENTS.md rule 3). Specs are still
  written per task; per-task gate is typecheck + lint + prettier + Vitest.
- Tracker is `docs/issues/` markdown; the issue file lands on `main` before the branch.
- The sticky bar works because it is an ordinary flex child at the end of the phone column
  (`PhoneShell`), not a fixed overlay: the window scrolls, there is no inner overflow
  container. Wrapping screens in a scroll container or giving the column
  `overflow: hidden` silently breaks both sticky elements.
- `env(safe-area-inset-bottom)` is 0 unless `src/app/(agro)/layout.tsx` exports
  `viewport = { viewportFit: "cover" }`; it is load-bearing and deliberately scoped to the
  phone screens (root-level would drop side insets on admin/auth too).
- The root `<Toaster />` is `position="top-center"`: bottom toasts covered the sticky bar
  and the wizard's only exit link after subscribing.
- Use `E2E_PORT=3100` for Playwright so `reuseExistingServer` cannot test a stale dev
  server on :3000.
- `ReasonList` sits inside `ChoiceCard`, which is a `<button>`: output must stay phrasing
  content (`span`/`svg`). A unit test enforces this.
- `Dictionary = typeof en`: edit `en.ts` before `ro.ts`; both dictionaries must agree.
- `eslint-plugin-react-hooks` v7 (via `eslint-config-next`) makes `refs`,
  `set-state-in-effect` and `purity` **errors**: no `ref.current` in render, no sync
  setState in effects (use ResizeObserver / rAF callbacks), no `new Date()` in render
  (`useState(() => new Date())`).
- Tailwind `md:` variants are viewport-based: on a desktop browser they fire inside the
  480px phone column. Phone screens must not use them (the vendor timeline had them
  stripped).
- The timeline dot is `sticky top-24 z-10`: the header and sticky bar are `z-20`, the
  header is ~71px tall. Raising the dot's z-index makes it float over the header.
- `.claude/**` (agent worktrees) is ignored by ESLint, Prettier and Vitest; the
  worktrees still exist and can be removed with `git worktree remove <path>`.
- Public sign-up is disabled; provision accounts with
  `bun run create-user <email> <password> [role] [name]`.
- The `/sign-in/email` rate limit is relaxed outside `NODE_ENV=production` so parallel
  Playwright workers can sign in from one host; production keeps better-auth's default.
- `.env` is local and gitignored; `bun run db:migrate` creates `dev.db` at the repo root.
- Ops scripts (`create-user`, `set-role`) use `bun:sqlite`; port them when moving to
  Postgres.
