# STATUS

## Now

- Branch `feat/sticky-header-cta-bar` (**stacked on the unmerged
  `feat/wizard-content-refinements`**, by decision): the phone chrome stops scrolling away.
  `PhoneHeader` is `sticky top-0 z-20 bg-background`; a new shared `StickyBar`
  (`src/components/agro/sticky-bar.tsx`) closes all five public screens with a solid
  `bg-background` strip, a `border-t` hairline, the `px-5` gutter and
  `pb-[calc(14px+env(safe-area-inset-bottom))]`. It holds the dashboard's dashed add-crop
  button, the `PrimaryCta` of teren/cultura/soi and the summary's subscribe CTA (which
  left its card; the card keeps heading + body, the bar grows to hold "Abonat" + the back
  link after subscribing). The loading screen gets no bar. `PrimaryCta` lost its
  `mt-[22px]`, `Screen`'s bottom padding went 30px → 18px, and the root layout opts into
  `viewportFit: "cover"` so the safe-area inset is non-zero.
  Issue: `docs/issues/0002-sticky-header-and-cta-bar.md`, status `In Review`.
- Green on this branch: `bun run format`, `bun run typecheck`, `bun run lint`,
  `bunx prettier --check .`, `bun run test` (13 files, 80 tests).
- Its PR targets `feat/wizard-content-refinements`, not `main`.
- Branch `feat/wizard-content-refinements` (off `main`): three content changes to the
  wizard prototype — the alert **channel** is replaced by a single alert **subscription**
  card confirmed with a sonner toast (disabled "Abonat" + back link afterwards); every
  crop/variety card gains three icon bullets (soil, sowing window, weather) plus a caution
  line on the risky options via the new `ReasonList`; the loading screen plays five steps
  naming the real inputs (~4 s) instead of four about a 7-day forecast. `CONTEXT.md`
  trades the Alert Channel row for Alert Subscription. Issue 0001, status `In Review`.
  **Its PR is still not open — `gh` is not authenticated (`gh auth login`).**
- **The e2e specs on both branches are updated but have never been run** — see the
  pre-deploy rule below.
- `main` carries the tracker commit and both issue files (0001, 0002).

## Next

- `gh auth login`, then open the PR for `feat/wizard-content-refinements` and the one for
  `feat/sticky-header-cta-bar` (base `feat/wizard-content-refinements`; body drafted in the
  session scratchpad as `pr-body-0002.md`). Wait ~10 min for CodeRabbit on each, address
  feedback. Never auto-merge.
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

- **`feat/sticky-header-cta-bar` is stacked on `feat/wizard-content-refinements`**, against
  AGENTS.md rule 10. Merge 0001 first, then rebase or retarget this branch onto `main`
  before merging it; do not merge it into `main` while its base is unmerged.
- The sticky bar works because it is an ordinary flex child at the end of the phone column
  (`PhoneShell`), not a fixed overlay: the window scrolls, there is no inner overflow
  container, so `sticky bottom-0` pins it to the viewport while the content still reserves
  the space. Wrapping the screens in a scroll container, or giving the column
  `overflow: hidden`, would silently break both sticky elements.
- `env(safe-area-inset-bottom)` is 0 unless the document asks for the full display: the
  root layout's `export const viewport = { viewportFit: "cover" }` is load-bearing, not
  decoration.
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
