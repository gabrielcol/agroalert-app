# Changelog

Every task, bugfix or modification gets an entry here (newest first). Each entry names the
**datetime** and the **branch** it was made on.

- **2026-09-12 (EEST)** — `main` — Whitelabel reset. Removed the previous product's domain
  features, screens (including the tablet/kiosk flow), naming, ticket references, client
  brief and history. What remains is the reusable foundation: better-auth (sign-in,
  admin-provisioned accounts) + RBAC (`admin` / `member` / `auditor`), an append-only audit
  log, user management, a system-settings singleton (default locale, site name), EN/RO
  i18n (English default), the demo `Post` slice, security headers, Docker packaging, and
  the Vitest + Playwright setup. Migrations squashed into a single `init`. Package renamed
  to `app-base`. Dev/test sign-in rate limit relaxed so parallel e2e workers pass.
