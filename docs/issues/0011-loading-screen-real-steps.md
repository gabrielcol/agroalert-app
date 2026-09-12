---
status: In Review
branch: feat/loading-screen-real-steps
created: 2026-09-13
---

# Loading screen: every step driven by a real call, one step at a time

## Description

The wizard's loading screen (`src/components/agro/loading-screen.tsx`, rendered by
`src/components/agro/teren-screen.tsx` once the teren step is submitted) shows six steps,
of which only the first is real. The other five tick forward on a 650 ms timer while a
single blocking `recommendation.crops` call does the whole job — the Weather Brief (ten
years of archive, the forecast, the current season, the seasonal outlook) and then the
Claude call. The progress a farmer watches is therefore fiction: it can finish its list
long before the work is done, or sit on the last step for twenty seconds.

Two changes.

**1. Four steps, each waiting on its own call.** The six steps become four, in order:

| Step             | Call                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| `location`       | `geocode.search` (skipped — completes at once — when the phone gave a point) |
| `history`        | **new** `weather.climate` — freshens the Climate Profile slice (10y archive) |
| `forecast`       | **new** `weather.forecast` — freshens forecast + current season + outlook    |
| `recommendation` | `recommendation.crops` — now a warm cache, then the Claude call              |

`fieldProfile.create` still runs between `location` and `history` and is still not a
displayed step. A step never advances before its call has resolved; a short minimum dwell
(~350 ms) keeps a cache hit from flashing past.

Server-side, `getWeatherBrief` is split into per-phase pieces so the two new procedures
can refresh one slice of the `WeatherCell` cache each, while `getWeatherBrief` keeps its
current behaviour and output exactly (including ADR 0003: it still writes the cell once,
at the end, and writes nothing when a piece fails).

**2. One step on screen, with a fade.** The `<ol>` of six lines becomes a single centred
line (icon + label) that crossfades vertically as the work advances: the outgoing step
slides up and fades out, the incoming one rises into place. `motion/react` (already a
dependency) with `AnimatePresence mode="wait"`; `useReducedMotion` collapses it to a plain
opacity fade. The container height is fixed so nothing jumps. The spinner, the error
title, the animated dots and the retry button are unchanged.

## Scope

**In**

- `src/lib/weather/brief.ts` — export per-phase functions (`ensureClimateProfile`,
  `ensureShortRange`, `ensureOutlook`) and the two cache-refreshing entry points
  (`refreshClimateProfile`, `refreshForecast`) that the router calls; `getWeatherBrief`
  composed from the same pieces, behaviour unchanged.
- `src/server/trpc/routers/weather.ts` — `weather.climate` and `weather.forecast`, both
  `{ fieldProfileId }` in, `{ cellId, refreshed }` out, errors mapped exactly as
  `weather.brief` maps them.
- `src/lib/agro/mock-data.ts` — `LOADING_STEPS` becomes the four real steps.
- `src/lib/agro/loading-stages.ts` — the timer state machine becomes a pure model driven
  by a count of completed calls.
- `src/components/agro/loading-screen.tsx` — single fading step line.
- `src/components/agro/teren-screen.tsx` — sequential run, one step advanced per resolved
  call, retry re-runs it.
- `src/lib/i18n/dictionaries/{en,ro}.ts` — `steps` drops `crops`/`windows`/`list`, gains
  `recommendation`.

**Out**

- The `recommendation.crops` contract, which does not change.
- Parallelising the two weather calls (they are shown as two steps on purpose).
- Streaming progress from the server.

## Acceptance criteria

- [ ] Exactly four steps are defined, in the order location → history → forecast →
      recommendation, and each one is backed by a real call.
- [ ] `weather.climate` and `weather.forecast` exist, take `{ fieldProfileId }`, return a
      small zod-validated payload, and map `FieldProfileNotFoundError` to `NOT_FOUND` and
      `WeatherUnavailableError` to `SERVICE_UNAVAILABLE`.
- [ ] `weather.climate` touches only the Climate Profile slice of the cell;
      `weather.forecast` touches only the forecast / current-season / outlook slices.
- [ ] `getWeatherBrief` keeps its behaviour and output — every existing test still passes.
- [ ] Only one step is on screen at a time; it crossfades vertically, respects
      `prefers-reduced-motion`, and the container height does not change between steps.
- [ ] The rendered step keeps `data-stage` and `data-state` so Playwright can target it,
      and progress is announced through a polite live region.
- [ ] An error freezes the current step and shows the existing error title + retry; retry
      re-runs the sequence without creating a second Field Profile.
- [ ] Per-task gate green: typecheck, lint, prettier, Vitest.

## Tests required

- **Vitest**: the new pure loading model (`loading-stages.test.ts`); one test that the
  per-phase weather split refreshes only its own slice.
- **Playwright**: `e2e/teren.spec.ts` gains `weather.climate` / `weather.forecast` mocks
  and asserts a single `[data-stage]` element progressing to `recommendation`. Not run —
  the suite runs pre-deploy only (AGENTS.md rule 3).

## Dependencies

- None. Branches off `main` after issue 0009.

## Note

Numbered 0011, not 0010: `0010-agroplan-branding.md` already holds that number.

In Review without a PR: `gh` is unauthenticated in this environment, so the branch
`feat/loading-screen-real-steps` is ready locally and has not been pushed. Playwright was
not run (pre-deploy only, AGENTS.md rule 3).
