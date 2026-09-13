# agro-app — status

_Updated: 2026-09-13_

## Now

- Issue 0018 (AI call timeout, one output retry, self-explaining logs) is **Done**: merged
  into `main` as 75341bc on 2026-09-13 and pushed, without a PR (merged locally by the
  user; `gh` is not logged in on this machine). The Anthropic client is built with
  `timeout: 60_000` / `maxRetries: 1`; each step retries **once** on an `AiOutputError` by
  feeding the failed turn plus the Zod issues back as `is_error` tool_results (cached
  prefix untouched); `max_tokens` truncation is a new `AiOutputTruncatedError` and is not
  retried, nor are API throws. One `ai_call` row per API call still holds, numbered by the
  new `attempt` column (migration `20260913073205_ai_call_attempt`; on `dev.db` it was
  applied with `sqlite3` because Prisma hit the lock — run `bun run db:migrate` on any other
  local DB). `src/lib/ai/service.ts` emits one `[recommendation] {...}` line per step. Gate
  was green on the branch; `main` had only a docs commit since the branch point.
  `e2e/ai-retry.spec.ts` is written, **not run**: it goes through the pre-deploy Playwright
  pass. Root cause of the first-attempt failure is still **unproven** (no shell access to
  the box today). Deploy follow-up: set `AI_MODEL=claude-haiku-4-5` in the container env,
  redeploy (`prisma migrate deploy` applies the `ALTER TABLE`), then after the next failure
  read the `[recommendation]` lines and the `ai_call` rows (`durationMs`, `attempt`,
  `errorName`): an ok row longer than the user's wait means something in front of Node cut
  the request; an error row names the cause.
- Issue 0017 (start screen shown once per browser session: `sessionStorage` flag
  `agro.startScreenSeen` read through a hydration-safe external store in
  `src/lib/agro/start-screen-storage.ts`; `HomeScreen` skips the splash when set,
  regardless of auth) is **Done**: merged into `main` as e524390 on 2026-09-13. Gate green;
  the new e2e case in `e2e/start-screen.spec.ts` (same-context revisit shows no splash,
  new context shows it again) was written but not run — run it before the next deploy.
- Issue 0010 (AgroPlan branding: product name everywhere, green/amber theme tokens on the
  logo's own hues, `agroplan` package/Docker names) is **Done**: merged into `main` on
  2026-09-13. Resolved against issue 0014: the PNG logos and `src/app/icon.png` from 0014
  win; the branch's inline-SVG `Brand`, `brand.test.tsx` and `src/app/icon.svg` were
  dropped in the merge. `--brand` is now the forest green.
- Issue 0016 (Docker boot: `prisma migrate deploy` failed with "unable to open database
  file: ./dev.db" and an OpenSSL warning) is **Done** and on `main`. Causes: the dev
  `DATABASE_URL=file:./dev.db` reached the container (`--env-file .env` overrides the
  image default `file:/data/app.db`) and `/app` was root-owned in the runner; the runner
  also lacked `openssl`. Fix: runner installs `openssl`/`ca-certificates`, `/app` is
  chowned to `node`, and `docker-entrypoint.sh` resolves the SQLite path, creates its
  directory and fails with a readable message when it is unwritable
  (`ENTRYPOINT_DRY_RUN=1` exercises it). Docker is not installed on this machine: the
  image has **not** been rebuilt; verify on the next deploy that the log shows
  `> Database: /data/app.db`.
- `main` is **pushed to origin** and holds everything through issue 0016, including
  issue 0015 (`fix/admin-topbar-hydration-mismatch`, admin topbar hydration mismatch,
  merged 2026-09-13; its gate was run by another session, not re-run on the merge). The
  main checkout is still on that branch; merges from this machine run in a temporary
  worktree so that checkout is not moved.
- Issue 0014 (start screen with mock loading on `/`; PNG logos from `public/logos/` in
  `Brand`, the phone header, sidebar and auth screens; cropped `src/app/icon.png` replaces
  `favicon.ico`; `app.name` = "AgroPlan") is **Done**: merged as 00b90e0. Gate green on the
  branch: typecheck, lint, prettier, Vitest (47 files / 295 tests). Playwright
  `e2e/start-screen.spec.ts` written, not run. Known limitation: the header/sidebar keep
  the green lockup in dark theme (mediocre contrast); only the auth panel swaps to
  `logo-dark`. Issue 0010 (full AgroAlert → AgroPlan rename, theme tokens) still Todo.
- Issue 0013 (log every AI call: raw response, model, input/output/cache tokens as
  separate columns, failures included, rows linked to the recommendation they produced)
  is **Done**: merged as c6e0ea5. New Prisma model `AiCall` (`ai_call`), migration
  `20260912215822_ai_call_log`, `src/lib/ai/call-log.ts`. Gate green on the branch:
  typecheck, lint, prettier, Vitest (46 files / 298 tests). Playwright spec written, not
  run. Run `bun run db:migrate` on any local DB other than `dev.db`; there the migration
  was applied via `sqlite3` because a DB IDE held the file locked (`prisma migrate status`
  is clean). The gate has not been re-run on the merged `main`.
- Issue 0012 (dashboard hydration mismatch: `prefetch` was not awaited) is **Done**:
  merged as c3c74fe. `prefetch()` now returns its promise and the dashboard, audit and
  users pages await it. `e2e/dashboard.spec.ts` fails on any "Hydration" page error; an
  uncommitted local edit to that spec also collects console errors (not committed).
- Eight untracked `e2e/zz*.spec.ts` files of unknown origin sit in the checkout; they
  will run with the pre-deploy Playwright suite unless removed.
- Known e2e noise: `e2e/teren.spec.ts` stubs `recommendation.crops` with `{ id,
fieldProfileId }` and no `result`, so the cultura step throws `Cannot read properties of
undefined (reading 'top')` in the browser after the redirect. The spec still passes;
  fix by reusing `CROP_RECOMMENDATION` from `e2e/recommendation-mocks.ts`.
- Issues 0008, 0009 and 0011 are **Done** and on `main`. Last Playwright run: 25 passed
  after issue 0011 (`fix/e2e-wizard-weather-mocks`, 6ffcd88); not run since.
- The AI leg has never run for real: no `ANTHROPIC_API_KEY` in any local `.env`. Add one,
  walk `/plan/teren` → cultura → soi once, record the result in
  `docs/issues/0007-weather-brief-integration.md` (it says "pending a key"), and check
  the `ai_call` rows it leaves.
- Worktrees under `.claude/worktrees/` (five supervisor ones plus `agroplan-branding`)
  still exist; their branches are pushed. Remove with `git worktree remove <path>` when
  convenient.

## Next

1. Open PRs for `feat/field-location-teren`, `feat/weather-brief-client`,
   `feat/crop-variety-recommendation`, `feat/weather-brief-integration` (issues 0004–0007
   are In Review) once `gh auth login` is done, then mark them Done.
2. Foundation follow-up: `WeatherCell` has no Current Season column; it rides inside the
   `forecast` JSON column (`src/lib/weather/brief.ts`). Add a column + migration.
3. Rezumat step follow-up: the "when to sow" window box is still static copy; show the
   recommendation's real Sowing Window. Undo / backdating of the Sowing Date is out of
   scope of 0008.

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
