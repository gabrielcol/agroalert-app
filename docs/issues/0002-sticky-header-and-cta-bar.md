---
status: In Review
branch: feat/sticky-header-cta-bar
created: 2026-09-12
---

# Sticky header and sticky bottom CTA bar on the phone screens

## Description

On the AgroAlert phone screens the header scrolls away and the primary action sits at the
bottom of the document, so on a real phone the farmer has to scroll to find out what to tap
next. The plan summary is the worst case: the subscribe button is four cards down.

Both chrome elements become sticky within the phone column:

- **Header.** `PhoneHeader` gets `sticky top-0 z-20` on an opaque background, so the brand
  (or screen title) and the step dots stay on screen while the body scrolls. It keeps its
  bottom hairline.
- **Bottom CTA bar.** A new shared `StickyBar` (`src/components/agro/sticky-bar.tsx`)
  renders a solid `bg-background` bar with a top hairline, the same `px-5` gutter as
  `Screen`, ~14px of vertical padding and safe-area padding at the bottom, stuck to
  `bottom-0`. It holds whatever action closes the screen.

The bar is used on all five public screens: the dashboard (`/`) and the four wizard steps
(`/plan/teren`, `/plan/cultura`, `/plan/soi`, `/plan/rezumat`). On teren, cultura and soi it
replaces the `flex-1` spacer + `PrimaryCta` at the end of `Screen`. On the dashboard it holds
the dashed "add a crop" button, unchanged in style. On the summary the subscribe card keeps
its heading and body in the scroll, but its button moves into the bar; after subscribing the
bar shows the disabled "Abonat" button and, under it, the link back to the dashboard.

The loading screen (played by the teren step while it "prepares the recommendation") has no
action, so it gets no bar.

Prototype-level change: layout and chrome only, no data flow, no API.

## Acceptance criteria

- [ ] `PhoneHeader` is `sticky top-0` with an opaque background (light **and** dark) on every
      screen that renders it.
- [ ] A single shared `StickyBar` component exists under `src/components/agro/` and is the
      only place the bar's styling is defined.
- [ ] The bar is `sticky bottom-0`, solid `bg-background`, has a top hairline (`border-t`),
      `px-5` horizontal padding matching `Screen`, ~14px vertical padding, and bottom padding
      that adds `env(safe-area-inset-bottom)`.
- [ ] The bar appears on the dashboard and on all four wizard steps.
- [ ] The loading screen shows **no** bar.
- [ ] Scroll content is never hidden behind the bar: the last item of a long screen is fully
      readable once scrolled to the bottom.
- [ ] Summary screen: the subscribe card keeps its heading and body; the CTA lives in the bar.
      After tapping it, the bar shows the disabled "Abonat" button with the check icon **and**,
      below it, the "Înapoi la culturile tale" link.
- [ ] The dashboard's add-crop button keeps its dashed-outline styling and lives in the bar.
- [ ] Everything clickable is a shadcn `Button` (or the existing `PrimaryCta` built on it).
- [ ] Vitest unit tests cover `StickyBar` (children, sticky/bottom classes, safe-area padding)
      and the sticky `PhoneHeader`.
- [ ] The Playwright spec asserts, at a phone viewport, that the header and the summary's
      subscribe button are on screen without scrolling. Written now, run pre-deploy per the
      amended AGENTS.md rule 3.
