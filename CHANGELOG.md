# Changelog

Every task, bugfix or modification gets an entry here (newest first). Each entry names the
**datetime** and the **branch** it was made on.

- **2026-09-12 22:12 (EEST)** — `main` — Issue 0002: sticky header and CTA bar
  ([`docs/issues/0002-sticky-header-and-cta-bar.md`](docs/issues/0002-sticky-header-and-cta-bar.md)).
  Opened the ticket for making `PhoneHeader` sticky at the top and adding a shared
  `StickyBar` at the bottom of the five public AgroAlert screens (dashboard + the four
  wizard steps), with the agreed bar style (solid `bg-background`, top hairline, `px-5`,
  ~14px vertical padding plus `env(safe-area-inset-bottom)`), the summary screen's subscribe
  button moving out of its card into the bar, and no bar on the loading screen. Docs-only,
  so test-exempt under AGENTS.md rule 3. The work branch `feat/sticky-header-cta-bar` is
  cut from `feat/wizard-content-refinements`, **deliberately stacked on that unmerged
  branch** (user's decision, against rule 10) because the sticky bar rearranges the same
  screens that branch just rewrote; it must be rebased or retargeted onto `main` once
  issue 0001 merges.

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
