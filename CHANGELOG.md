# Changelog

Every task, bugfix or modification gets an entry here (newest first). Each entry names the
**datetime** and the **branch** it was made on.

- **2026-09-12 22:00 (EEST)** — `feat/wizard-content-refinements` — Wizard content
  refinements ([`docs/issues/0001-wizard-content-refinements.md`](docs/issues/0001-wizard-content-refinements.md)).
  Three changes to the wizard prototype. (1) **Alert subscription replaces the alert
  channel:** the summary screen's "Cum vrei să primești alertele?" radio card and the
  full-screen confirmation are gone; in their place a single "Primește alerte pentru acest
  plan" card whose CTA raises a sonner toast, then locks into a disabled "Abonat" state
  with a check icon and a link back to the dashboard. How alerts are delivered is not a
  property of a Sowing Plan, so `CHANNELS` / `ChannelId` / `DEFAULT_CHANNEL`,
  `SAMPLE_PLANS[].channel`, `agro.rezumat.channel`, `agro.rezumat.activate`, `agro.done`
  and `src/components/agro/channel-options.tsx` were all removed (the shadcn
  `ui/radio-group` primitive stays). (2) **Reasons on every choice card:** new
  `ReasonList` component renders three always-visible icon bullets — soil fit, sowing
  window, weather fit — plus a muted caution line on the risky options only (orz, rapiță,
  Pitar, Ursita), on both the crop and variety screens. It emits `span`/`svg` only,
  because it lives inside `ChoiceCard`'s `<button>`. Crop and variety descriptions were
  rewritten so they no longer restate the bullets. (3) **Loading screen:** the four steps
  about a 7-day forecast became five steps naming what the recommendation actually rests
  on (past years' weather, the forecast ahead, crops, sowing windows, the list itself),
  ~4 s total; `STEP_MS` unchanged. `CONTEXT.md` swaps the Alert Channel row for an Alert
  Subscription row. Tests: new `src/lib/agro/mock-data.test.ts` (step ids and order,
  RO/EN copy parity including which ids carry a caution, channel-free `SAMPLE_PLANS`) and
  `src/components/agro/reason-list.test.tsx` (order, optional caution, `aria-hidden`
  icons, phrasing-content-only markup); Vitest is green (72 tests). The Playwright spec
  `e2e/agro.spec.ts` was updated for all three changes but **not run** — per the amended
  AGENTS.md rule 3 the e2e suite runs before each deploy, not per PR.

- **2026-09-12 21:56 (EEST)** — `main` — Markdown issue tracker + e2e gate moved to
  pre-deploy. Added `docs/issues/` as the project's issue tracker (one markdown file per
  issue, `NNNN-kebab-slug.md`, frontmatter `status` / `branch` / `created`) with
  `docs/issues/README.md` describing the format, and the first issue,
  `docs/issues/0001-wizard-content-refinements.md`. `AGENTS.md` rule 1 now points at that
  folder instead of the `<TRACKER_URL>` placeholder; rule 3 keeps "every task ships unit
  **and** e2e tests" but makes the per-task gate `typecheck` + `lint` +
  `prettier --check` + Vitest, with the Playwright suite running **before each deploy**
  rather than per PR (prototype/hackathon pace). The no-runtime-surface exemption is
  unchanged. Docs-only, so test-exempt under that rule. Committing the issue file to
  `main` is the analogue of opening a ticket, not task work.

- **2026-09-12 13:45 (EEST)** — `feat/agroalert-design-shell` — AgroAlert design shell.
  Implemented the Claude Design prototype (`app/index.html`) as public Next.js routes: `/`
  (sowing-plan dashboard), `/plan/teren`, `/plan/cultura`, `/plan/soi`, `/plan/rezumat`,
  with the staged loading screen and the "alerts active" confirmation. Prototype-level
  interactivity only (selection states, step navigation, timed loading); no persistence or
  API. Authentication is hidden, not removed: the old landing page and its sign-in link are
  gone, the `(admin)` area keeps its session guard and `/sign-in` still resolves. Theme
  re-tokenised to the design (Geist / Geist Mono, warm-neutral ink primary, green signal
  accent, `brand` / `success` / `warning` / `subtle` / `faint` colours). App renamed
  "AgroAlert"; default locale switched to Romanian (EN stays selectable via the admin-area toggle; the public screens follow the design and have none); new `agro`
  i18n namespace in both dictionaries. Added shadcn `toggle` / `toggle-group`. Fixed the
  prototype's duplicated "Alerte pentru zona ta" card (one card, three rows). Tests: unit
  (`plan-steps`), e2e (`e2e/agro.spec.ts`), and the language-toggle / config-default specs
  updated for the RO default. Started `CONTEXT.md` (domain glossary). Review follow-ups: dropped the `cn` package the
  shadcn CLI added by mistake, moved `SystemConfig.defaultLocale`'s schema default to `ro`
  (migration `default_locale_ro`), pointed the admin sidebar wordmark at `/dashboard`
  (the public shell has no route back into the signed-in area), swapped the sign-in
  panel glyph to the sprout, and refreshed the README i18n/structure notes.

- **2026-09-12 (EEST)** — `main` — Whitelabel reset. Removed the previous product's domain
  features, screens (including the tablet/kiosk flow), naming, ticket references, client
  brief and history. What remains is the reusable foundation: better-auth (sign-in,
  admin-provisioned accounts) + RBAC (`admin` / `member` / `auditor`), an append-only audit
  log, user management, a system-settings singleton (default locale, site name), EN/RO
  i18n (English default), the demo `Post` slice, security headers, Docker packaging, and
  the Vitest + Playwright setup. Migrations squashed into a single `init`. Package renamed
  to `app-base`. Dev/test sign-in rate limit relaxed so parallel e2e workers pass.
