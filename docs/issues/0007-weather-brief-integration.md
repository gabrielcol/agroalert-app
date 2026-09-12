---
status: In Review
branch: feat/weather-brief-integration
created: 2026-09-12
---

# Weather Brief Integration: real seam, e2e walk-through, docs and changelog

## Description

Issues 0004 (Field Location / teren), 0005 (Open-Meteo client) and 0006 (Crop / Variety
Recommendation AI call) were built in parallel off `main`, each against its own stub or
fixture. This issue is the integration pass once all three have merged: it swaps the
recommendation service's fixture Weather Brief for the real `getWeatherBrief` from issue
0005, brings the shared `e2e/agro.spec.ts` walk-through in line with the real four-step
URL contract the three branches actually produced, reconciles the docs the three merges
left behind, and does one manual live check against real Open-Meteo.

**Branches off `main` only after issues 0004, 0005 and 0006 have all merged to `main`.**
Its own file set is small and mostly disjoint from the three (the recommendation seam,
the shared e2e spec, `.env.example`, `README.md`, `CHANGELOG.md`) — safe to start as soon
as the last of the three lands.

## Scope

**In**

- Swap the recommendation service's Weather Brief seam: `src/lib/ai/weather-brief-source.ts`
  currently exports `fixtureWeatherBriefSource`, wired into `getRecommendationService()` in
  `src/lib/ai/service.ts` (the `TODO(issue 0005)` left there). Replace it with a source
  backed by the real `getWeatherBrief(fieldProfileId, { db })` exported from
  `src/lib/weather` (issue 0005), passing the request-scoped Prisma client as `db`.
- Map `FieldProfileNotFoundError` / `WeatherUnavailableError` thrown by
  `src/lib/weather`'s `getWeatherBrief` to the existing tRPC codes the recommendation
  router already maps its own errors to (`toTRPCError` in
  `src/server/trpc/routers/recommendation.ts`). Note the naming collision: issue 0005's
  `WeatherUnavailableError` (`src/lib/weather/open-meteo.ts`, re-exported from
  `src/lib/weather`) and issue 0006's `WeatherUnavailableError`
  (`src/lib/ai/errors.ts`) are two distinct classes with the same name — the seam must
  import 0005's under an alias and re-throw 0006's (or otherwise make the mapping
  unambiguous) rather than let a bare `instanceof` check silently miss one of them.
  `FieldProfileNotFoundError` (issue 0005) has no existing mapping in
  `RECOMMENDATION_ERRORS` / `toTRPCError` and needs one (`NOT_FOUND`).
- Delete the now-dead `fixtureWeatherBriefSource` and its fixture-only test seam once the
  real source is wired, unless a Vitest fake still needs it as a test double — keep the
  fixture module (`weatherBriefFixture`) only if a test still imports it directly.
- Fix the shared `e2e/agro.spec.ts` four-step walk-through: it currently drives the
  pre-0004/0005/0006 `SAMPLE_PLANS` mock UI (no `page.route` mocking, no query-string
  contract) and no longer matches the real teren → cultura → soi → rezumat flow the three
  merged branches produce. Mock `geocode.search`, `fieldProfile.create`,
  `recommendation.crops` and `recommendation.varieties` via `page.route`, reusing
  `e2e/recommendation-mocks.ts` (`mockRecommendation`, `CROP_RECOMMENDATION`,
  `VARIETY_RECOMMENDATION`) from issue 0006 and the teren-step mocking pattern from
  `e2e/teren.spec.ts` (issue 0004). Follow the real URL contract: `/plan/cultura?profile=`,
  `/plan/soi?profile=&rec=&crop=`, `/plan/rezumat?profile=&rec=&crop=&variety=` (query
  param names per `WIZARD_PARAMS` in `src/lib/agro/plan-steps.ts`).
- `.env.example`: reword the `ANTHROPIC_API_KEY` / `AI_MODEL` comment from "(required,
  server only)" to reflect what `src/env.ts` already enforces after issue 0006 —
  `ANTHROPIC_API_KEY` optional at boot (so `bun dev` and the Playwright web server start
  without a key) and required only at recommendation-call time (`MissingApiKeyError`).
- `README.md`: add the Anthropic env vars (`ANTHROPIC_API_KEY` optional at boot, required
  at recommendation time; `AI_MODEL`, default `claude-sonnet-5`) to wherever the other
  env vars / setup steps are documented — currently undocumented there.
- Reconcile `CHANGELOG.md`: issues 0004, 0005 and 0006 each add their own entry on merge;
  keep every entry, chronological (newest first, matching the existing convention), no
  entries dropped or rewritten — only reorder/dedupe if the three merges produced
  out-of-order or overlapping timestamps.
- Manual verification: once locally, with a real `ANTHROPIC_API_KEY` (and no
  `SKIP_ENV_VALIDATION`), run the app and walk teren → cultura → soi against live
  Open-Meteo (no mocks) end to end. Record the result (pass/fail, what was seen) in this
  issue file under Acceptance criteria / a short note, since it cannot be captured by CI.

**Out**

- Any change to the Weather Brief aggregation, the Open-Meteo client, or the
  `WeatherCell` cache themselves (issue 0005's implementation is frozen once merged).
- Any change to the Crop/Variety Recommendation prompt, schema or persistence (issue
  0006's implementation is frozen once merged).
- Any change to the teren screen, geocoding or Field Profile creation (issue 0004's
  implementation is frozen once merged).
- New product behavior of any kind — this issue only re-points a seam, repairs a stale
  e2e spec, and reconciles docs.

## Acceptance criteria

- [x] `getRecommendationService()` builds its `WeatherBriefSource` from the real
      `getWeatherBrief` (issue 0005) instead of `fixtureWeatherBriefSource`; no code path
      reaches the fixture Weather Brief outside of tests that explicitly ask for it.
- [x] A thrown `FieldProfileNotFoundError` from `getWeatherBrief` surfaces as a tRPC
      `NOT_FOUND`; a thrown `WeatherUnavailableError` from `getWeatherBrief` surfaces as
      the existing `SERVICE_UNAVAILABLE` / `RECOMMENDATION_ERRORS.weather` mapping —
      verified against the correct (0005) `WeatherUnavailableError` class, not 0006's.
- [x] `e2e/agro.spec.ts`'s wizard walk-through mocks `geocode.search`,
      `fieldProfile.create`, `recommendation.crops` and `recommendation.varieties` via
      `page.route` and makes no live Open-Meteo or Anthropic call.
- [x] The walk-through follows the real URL contract at every step: `/plan/teren` →
      `/plan/cultura?profile=<id>` → `/plan/soi?profile=<id>&rec=<id>&crop=<id>` →
      `/plan/rezumat?profile=<id>&rec=<id>&crop=<id>&variety=<name>`.
- [x] `.env.example`'s `ANTHROPIC_API_KEY` / `AI_MODEL` comment matches `src/env.ts`'s
      actual behavior (optional at boot, required at recommendation time).
- [x] `README.md` documents `ANTHROPIC_API_KEY` and `AI_MODEL`.
- [x] `CHANGELOG.md` contains every entry from issues 0003-0006 unchanged, in
      chronological (newest-first) order, with no gaps (verified after the three merges;
      only this issue's entry was added).
- [ ] A manual end-to-end run against real Open-Meteo (real `ANTHROPIC_API_KEY`, no
      mocks) has been performed once locally and its result is recorded below. **Partially
      done**: the Open-Meteo leg is verified (see below); the Anthropic leg is pending a
      real key, which was not available in the environment that ran this issue.
- [x] Vitest and Playwright both pass locally before the PR opens (Vitest 38 files /
      233 tests; Playwright 24 passed with `E2E_PORT=3100`).

## Manual verification result

**2026-09-12, Open-Meteo leg (no mocks), performed with a throwaway script calling
`getWeatherBrief` directly against the local SQLite database** for a Field Profile at
lat 44.6 / lng 27.1:

- First call: 4.3 s, `weatherBriefSchema` valid. Climate Profile `ERA5-Land/ERA5`,
  span 2016–2025, 12 monthly normals, 10 year rows (September normal: tMean 19.7 °C,
  precip 38.1 mm, ET0 115.8 mm, water balance −77.7 mm). Current Season 2026 through
  2026-09-07, 9 months, 30 daily rows. Forecast 16 days, 7 trusted, day 0 = 2026-09-12
  (tMax 29.7, soil 0–9 cm 23.4 °C / 0.082 m³/m³). Seasonal Outlook EC46 weeks 3–7:
  colder, warmer, warmer, warmer, warmer.
- Second call: 2 ms, byte-identical brief, served from the single `WeatherCell` row
  (cell 44.6 / 27.1, climate and forecast fetched at the same instant).

**Anthropic leg: pending.** No `ANTHROPIC_API_KEY` was set locally, so the wizard was not
walked against the live model. To finish: set the key in `.env`, run `bun dev`, open
`/plan/teren`, enter a village, and confirm cultura and soi render model output; record
the result here.

**Bug found by the Playwright run and fixed on this branch:** `next.config.ts` sent
`Permissions-Policy: geolocation=()`, which disabled the teren step's locate button in
every browser ("Geolocation has been disabled in this document by permissions policy").
Now `geolocation=(self)`.

## Tests required

- **Vitest**: unit tests for the seam mapping in `src/lib/ai/weather-brief-source.ts` /
  `src/lib/ai/service.ts` — a fake `getWeatherBrief` throwing `FieldProfileNotFoundError`
  and one throwing `WeatherUnavailableError` (issue 0005's class) each surface as the
  correct typed error / tRPC code from the recommendation router; a passing fake
  `getWeatherBrief` result flows through to `recommendCrops` unchanged.
- **Playwright**: `e2e/agro.spec.ts` updated in place (mocked network, real URL
  contract per the acceptance criteria above); run pre-deploy per AGENTS.md rule 3.
- Both suites must pass locally before the PR opens.

## Dependencies

- Depends on issue 0004 (`feat/field-location-teren`), issue 0005
  (`feat/weather-brief-client`) and issue 0006 (`feat/crop-variety-recommendation`) all
  being merged to `main` first.
