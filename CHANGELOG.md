# Changelog

Every task, bugfix or modification gets an entry here (newest first). Each entry names the
**datetime** and the **branch** it was made on.

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
