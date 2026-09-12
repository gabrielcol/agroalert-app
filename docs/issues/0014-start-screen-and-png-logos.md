---
status: In Progress
branch: feat/start-screen-logos
created: 2026-09-13
---

# Start screen with mock loading; PNG logos across the app

## Description

The real AgroPlan artwork landed in `public/logos/` (`logo.png` transparent green/amber,
`logo-dark.png` cream/amber for dark grounds, `logo-green.png` pre-baked on forest green,
all ~2040×770). The app still shows the old whitelabel `Sprout` glyph in `Brand` and the
stock favicon.

Two things (asked 2026-09-13):

1. **Start screen.** Every visit to `/` first shows a full-bleed splash on the brand
   forest green with `logo-dark.png` centred and a mock progress bar that fills over
   about two seconds, then auto-continues (no tap) to the existing "Culturile tale"
   dashboard. Deep links to `/plan/*` and the admin/auth areas never show it. Reduced
   motion shortens the animation; the screen is still announced once to screen readers.
2. **Logos in the app.** `Brand` renders the PNG logo (via `next/image`, transparent
   `logo.png`; the cream variant on dark grounds such as the auth panel if it is dark)
   instead of the Sprout tile + text wordmark, in the phone header, the admin sidebar and
   the auth screens. The app icon becomes the calendar-sprout mark cropped from the
   artwork (`src/app/icon.png`), replacing `src/app/favicon.ico`. `app.name` becomes
   "AgroPlan" in both dictionaries so alt text matches the artwork (the full rename stays
   in issue 0010).

## Acceptance criteria

- [ ] Opening `/` shows the splash (green ground, `logo-dark.png`, progress bar) and,
      without interaction, the dashboard within ~2.5 s. `/plan/teren` shows no splash.
- [ ] `Brand` renders an `<img>` of the AgroPlan logo (no `Sprout` icon, no text
      wordmark) in the phone header, the sidebar and the auth screens; `showTagline` still
      works; sizes are constrained so the ~1 MB originals are never shipped at full size
      (downscaled copies under `public/logos/` are acceptable).
- [ ] `src/app/icon.png` exists (the calendar-sprout mark), `src/app/favicon.ico` is gone.
- [ ] `app.name` is "AgroPlan" in `en.ts` and `ro.ts`.
- [ ] Unit tests: the splash calls its `onDone` after the mock progress completes (fake
      timers); `Brand` renders an image with the app name as alt. An e2e spec is written
      (not run, pre-deploy only).
- [ ] Gate green: typecheck, lint, prettier, Vitest.
