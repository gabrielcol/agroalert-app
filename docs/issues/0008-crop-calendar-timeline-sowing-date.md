---
status: In Review
branch: feat/crop-calendar-timeline
created: 2026-09-12
---

# Crop Calendar timeline and Sowing Date

## Description

The plan summary step (`/plan/rezumat`) shows the Crop Calendar as a static card: five
i18n rows with coarse month labels, no dates computed, nothing persisted. Replace it with
a vertical timeline (shadcn Studio block `timeline-component-02`, scroll animation kept).
The first node marks that the seeds went in the ground; every later Stage is placed a
fixed number of days after the previous one; once the Sowing Date is known the absolute
dates fill in.

Confirming the Sowing Date is the moment a Sowing Plan comes into existence (CONTEXT.md
"Sowing Plan", "Sowing Date", "Stage"). Alerts are on for every Sowing Plan, so the
separate subscribe step goes away; the summary's sticky bar becomes "Mark as sown". The
dashboard lists the Sowing Plans this browser created, with their sown date and the next
Stage.

## Scope

**In**

- Prisma model `SowingPlan` (field profile, crop id, optional variety name, `sownAt`) and a
  migration; Zod contract in `src/lib/agro/sowing-plan.ts`; public tRPC router
  `sowingPlan` with `markSown`, `latestByProfile` and `byIds`.
- Static Stage offsets (`CALENDAR_STAGE_DAYS`: sowing 0, emergence +10, spring +150,
  treatments +60, harvest +50) and pure date helpers in `src/lib/agro/crop-calendar.ts`.
- The vendor timeline block under `src/components/shadcn-studio/blocks/`, adapted to the
  480px phone shell (single column, no marketing heading), plus a domain wrapper
  `CropTimeline`. New dependency `motion`.
- Summary screen: reads `profile`, `crop`, `variety` from the URL; title from the Crop
  Dictionary plus the variety; timeline replaces the calendar card; alerts card reworded
  "Alerts are on"; subscribe card, its state and toast removed; sticky bar "Mark as sown"
  with an inline "Sown today?" confirm, then a "Back to your crops" link. No sticky bar
  without wizard params.
- Dashboard: lists Sowing Plans whose ids this browser stored in `localStorage`
  (`agro.sowingPlanIds`), newest first, each with crop · variety, "Sown {date}" and
  "Next: {stage} in N days"; empty state when none; sample plan removed.
- Glossary: `Alert Subscription` row dropped; Stage, Sowing Date and the reworked Crop
  Calendar definitions (already on `main`).

**Out**

- Undo or backdating of the Sowing Date.
- Deriving Stage offsets from the Crop Dictionary or the AI recommendation.
- Farmer accounts; plans are per browser until the auth story is decided.
- A demo route for the vendor block.

## Acceptance criteria

- [ ] A `SowingPlan` row is created only when the farmer confirms "Sown today?"; it holds
      the field profile id, crop id, optional variety name and a server-side `sownAt`.
- [ ] `/plan/rezumat?profile=&crop=&variety=` shows "{crop} · {variety}" as the title and
      the five-Stage timeline with badges "Day 0", "+10 days", "+150 days", "+60 days",
      "+50 days".
- [ ] Before sowing every node is dimmed and the first node shows a hint to tap "Mark as
      sown"; after sowing the first node shows "Sown on {date}" and every Stage shows its
      absolute date.
- [ ] The sticky bar goes "Mark as sown" → "Sown today?" Cancel / Confirm → toast "Sown
      on {date}" → "Back to your crops" link; on reload the plan is found by `?profile`.
- [ ] Opening the summary without wizard params renders the dimmed timeline and no sticky
      bar.
- [ ] The subscribe card and its toast are gone; the alerts card reads "Alerts are on".
- [ ] The dashboard lists this browser's Sowing Plans with crop · variety, sown date and
      next Stage; with none it shows the empty state. `SAMPLE_PLANS` is gone.
- [ ] Per-task gate green: typecheck, lint, prettier, Vitest.

## Tests required

- **Vitest**: `sowing-plan` Zod contract; `sowingPlan` router with a fake db; crop
  calendar helpers (offsets, stage dates, next stage, DST day); `localStorage` id store;
  summary confirm flow and `CropTimeline` with the vendor block mocked.
- **Playwright**: `e2e/agro.spec.ts` updated for the new step 4 flow, dashboard empty and
  populated states and the phone-viewport sticky bar. Written per task, run pre-deploy
  (AGENTS.md rule 3).

## Dependencies

- None. Branches off `main` after issue 0007.
