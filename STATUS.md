# STATUS

## Now

- Branch `feat/wizard-content-refinements` (off `main`): three content changes to the
  wizard prototype — the alert **channel** is replaced by a single alert **subscription**
  card confirmed with a sonner toast (disabled "Abonat" + back link afterwards); every
  crop/variety card gains three icon bullets (soil, sowing window, weather) plus a caution
  line on the risky options via the new `ReasonList`; the loading screen plays five steps
  naming the real inputs (~4 s) instead of four about a 7-day forecast. `CONTEXT.md`
  trades the Alert Channel row for Alert Subscription.
- Green on the branch: `bun run typecheck`, `bun run lint`, `bunx prettier --check .`,
  `bun run test` (11 files, 72 tests).
- **`e2e/agro.spec.ts` on this branch is updated but has not been run** — see the
  pre-deploy rule below.
- The issue tracker is now `docs/issues/` (markdown files, frontmatter status). This
  task is `docs/issues/0001-wizard-content-refinements.md`, status `In Review`.
- `main` carries the tracker commit (`docs/issues/` + the AGENTS.md rule 1/3 amendments).

## Next

- Open/track the PR for `feat/wizard-content-refinements`, wait ~10 min for CodeRabbit,
  address feedback. Never auto-merge.
- The earlier `feat/agroalert-design-shell` PR, if still open, needs the same treatment.
- Before any deploy: `E2E_PORT=3100 bun run test:e2e` and fix whatever the suite catches
  (this branch's spec changes have never executed).
- Decide the real auth story for farmers (phone-number sign-in? none?) and un-hide or
  replace the better-auth flow accordingly.
- Give the wizard real data flow: carry the chosen Crop into step 3's title and the Plan
  summary, persist Sowing Plans, wire the dashboard list.
- Decide how an Alert Subscription is actually delivered (the glossary deliberately leaves
  it open) once there is a backend.
- Rename `app-base` in `package.json` / README to the product name.

## Blocked

- Nothing.

## Gotchas

- **e2e runs pre-deploy, not per PR** (AGENTS.md rule 3, prototype/hackathon pace). Specs
  are still written per task; the per-task gate is typecheck + lint + prettier + Vitest.
- Use `E2E_PORT=3100` for Playwright so `reuseExistingServer` cannot test a stale dev
  server on :3000.
- `ReasonList` sits inside `ChoiceCard`, which is a `<button>`: its output must stay
  phrasing content (`span`/`svg`), no `div`/`p`/`ul`. A unit test enforces this.
- `Dictionary = typeof en`, so `en.ts` is edited before `ro.ts`, and `reasons.caution` is
  required-or-absent per id — the two dictionaries must agree on which ids have one.
- The summary screen shows two `Bell` icons (alerts card + subscribe card); accepted by
  decision, swap one to `BellRing` only if review objects.
- Public sign-up is disabled; provision accounts with
  `bun run create-user <email> <password> [role] [name]`.
- The `/sign-in/email` rate limit is relaxed outside `NODE_ENV=production` so parallel
  Playwright workers can sign in from one host; production keeps better-auth's default.
- `.env` is local and gitignored; `bun run db:migrate` creates `dev.db` at the repo root.
- Ops scripts (`create-user`, `set-role`) use `bun:sqlite`; port them when moving to
  Postgres.
