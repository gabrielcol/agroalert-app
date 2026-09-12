---
status: Done
branch: feat/agroplan-branding
created: 2026-09-13
---

# AgroPlan branding: name, logo, app icon and green/amber theme

## Description

> Merged 2026-09-13 after issue 0014. The PNG logos and `src/app/icon.png` from 0014 won
> the merge; the inline-SVG `Brand` and `src/app/icon.svg` described below were dropped.
> The name, theme tokens and package/Docker rename landed as described.

The product is called **AgroPlan**, not "AgroAlert", and the repository is still named
`app-base`. The shell also carries the original whitelabel palette: a warm-neutral "ink"
base with a single green accent at hue 152, a `lucide-react` `Sprout` glyph in a rounded
square as the logo mark, and the stock `favicon.ico`.

This task lands the real brand:

- **Name** — "AgroPlan" in the document title, in both i18n dictionaries (`app.name`), in
  `package.json`, the README, the Prisma schema comments and the hand-written comments
  that still say "AgroAlert".
- **Logo** — a calendar-sprout mark drawn as inline SVG (a cream calendar with two ring
  tabs on a forest-green rounded tile, an amber two-leaf sprout rising from a cream field
  curve) plus the wordmark "AgroPlan", "Agro" in the foreground colour and "Plan" in
  amber. The wordmark split is derived from `t.app.name`, so a fork that renames the app
  keeps a working `Brand`.
- **App icon** — the same mark as a static `src/app/icon.svg` (Next.js metadata file
  convention); the old `src/app/favicon.ico` goes.
- **Theme** — the accent hue moves from an arbitrary 152 to the logo's own green (~149),
  primary becomes forest green, and amber joins as the second brand colour (accent,
  `chart-2`, the wordmark). Page surfaces stay exactly as they are: `--background`,
  `--card`, `--popover`, `--foreground`, `--muted`, `--border`, `--input` and the sidebar
  background tokens are untouched in both `:root` and `.dark`, so nothing about the
  existing layout shifts.

Brand colours sampled from the reference artwork: forest green `#1F4D2A`, cream
`#F5F0E4`, amber `#E8A33C`.

## Scope

**In**

- `src/components/shared/brand.tsx` — inline `AgroPlanMark`, split wordmark,
  `data-testid="brand"`; existing props (`className`, `showTagline`, `iconClassName`) and
  the three call sites (sidebar, phone header, auth screens) keep working.
- `src/app/icon.svg` (new), `src/app/favicon.ico` (deleted).
- `src/app/globals.css` — brand/primary/accent/secondary/ring/chart/sidebar-primary
  tokens in `:root` and `.dark`, plus a `--brand-amber` token mapped through
  `@theme inline`.
- The rename across `src/app/layout.tsx`, both dictionaries, `package.json`, `README.md`,
  `prisma/schema.prisma`, `CONTEXT.md` and the remaining hand-written comments.
- `STATUS.md` — drop the now-done "rename `app-base`" item.

**Out**

- Typography (the Geist pair stays; the reference wordmark's rounded sans is not
  licensed here — `font-black tracking-tight` stands in).
- Any layout, copy or component change beyond the brand lockup.
- Regenerating the committed Prisma client's copied comments beyond what
  `prisma generate` does.

## Acceptance criteria

- [ ] "AgroAlert" no longer appears in any hand-written file (the generated Prisma client
      and historical `CHANGELOG.md` entries excepted).
- [ ] `Brand` renders the inline calendar-sprout SVG plus "Agro" + "Plan", the second half
      in amber, and still honours `className`, `iconClassName` and `showTagline`.
- [ ] `src/app/icon.svg` exists, `src/app/favicon.ico` does not, and no
      `metadata.icons` entry is needed (Next picks `app/icon.svg` up automatically).
- [ ] `--primary` is the logo forest green with a cream foreground; `--accent` is an amber
      tint; `--ring`, `--brand*`, `--chart-1` and `--sidebar-primary` are on the logo green
      hue; `--chart-2` is the logo amber.
- [ ] `--background` and `--card` are byte-identical in both `:root` and `.dark`.
- [ ] Per-task gate green: typecheck, lint, prettier, Vitest.

## Tests required

- **Vitest**: `src/components/shared/brand.test.tsx` — the mark renders as an `svg`, the
  wordmark splits into "Agro" + "Plan", and the amber half carries the brand-amber class.
- **Playwright**: `e2e/branding.spec.ts` — the phone header brand is visible on `/` and
  the document title contains "AgroPlan". Written, not run (AGENTS.md rule 3: e2e runs
  pre-deploy).

## Dependencies

- None. Branches off `main` after issue 0009.
