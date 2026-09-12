---
status: Todo
branch: feat/field-location-teren
created: 2026-09-12
---

# Field Location: geocoding, Soil Class and Field Profile creation (teren step)

## Description

The `teren` step currently collects village name, land bucket, irrigation and Soil Class
into local state with no Field Location and no persistence. This issue wires it to real
Open-Meteo geocoding (and the browser's own geolocation), resolves a Field Location, and
submits a real `FieldProfile` through the tRPC contracts frozen in issue 0003.

**Branches off `main` only after issue 0003 has merged** (per AGENTS.md rule 10 — the
Prisma models and the `fieldProfile.create` / `geocode.search` contracts must exist and
be frozen before this starts). Files are disjoint from issues 0005 and 0006: this issue
owns the teren screen, the loading screen, the geocode router, and the teren i18n keys
only.

## Scope

**In**

- `geocode.search` implemented against the Open-Meteo Geocoding API, `countryCode=RO`;
  the first match is taken silently (no disambiguation UI).
- Browser geolocation wired to the existing disabled locate button; the resolved point is
  reverse-resolved to a place name for display.
- Soil Class tap control: 5 options (`cernoziom`, `lutos`, `argilos`, `nisipos`,
  `unknown`), default `unknown`.
- Land bucket mapped from a free surface value (or existing bucket control) to
  `small` (under 5 ha) / `medium` (5-10 ha) / `large` (over 10 ha).
- Submitting the teren step calls `fieldProfile.create`, then navigates to
  `/plan/cultura?profile=<id>`.
- Loading screen becomes six real stages: a new first stage "Găsim terenul" (resolving
  the Field Location) prepended to the five stages committed in issue 0001, driven by
  real progress (geocode/geolocation resolving, then the profile-create call), not a
  fixed timer for the new stage.

**Out**

- Weather Brief fetching, Crop Recommendation or Variety Recommendation calls — the
  loading screen's remaining five stages keep their issue-0001 copy and timing until
  0005/0006 land.
- Disambiguating multiple geocoding matches — first match wins, per ADR-adjacent product
  decision for the pitch timeline.
- Any change to `cultura-screen.tsx`, `soi-screen.tsx`, or their routers.

## Acceptance criteria

- [ ] Typing a village name and submitting resolves a Field Location via
      `geocode.search` (Open-Meteo, `countryCode=RO`), taking the first result.
- [ ] Tapping the locate button requests browser geolocation, reverse-resolves a display
      name, and fills the same Field Location state as a typed search.
- [ ] The Soil Class control offers exactly the 5 options above, defaulting to `unknown`
      when untouched.
- [ ] The land-size input maps to `small` / `medium` / `large` at the under-5 / 5-10 /
      over-10 ha boundaries.
- [ ] Submitting the teren step creates a `FieldProfile` row via `fieldProfile.create`
      and navigates to `/plan/cultura?profile=<id>` with the real created id.
- [ ] The loading screen plays six stages in order, "Găsim terenul" first, matching the
      five stages already committed in issue 0001; the new stage's duration reflects real
      resolution progress rather than a fixed `STEP_MS`.
- [ ] No Alert Channel, no removed-in-0001 code path, is reintroduced.
- [ ] RO/EN parity on every new i18n key this issue adds.

## Tests required

- **Vitest**: geocode router unit tests (Open-Meteo response mapped to `{ name, lat,
lng }`, `countryCode=RO` param asserted, fetch injected/mocked); teren-screen unit
  tests for Soil Class default, land-bucket mapping boundaries, and the submit → navigate
  flow with a mocked tRPC client; loading-screen test for six-stage order and the new
  stage's copy.
- **Playwright**: extend `e2e/agro.spec.ts` (or a new `e2e/teren.spec.ts`) covering
  typed-village submission through to landing on `/plan/cultura?profile=<id>`, the
  geolocation button's happy path with a mocked `navigator.geolocation`, and the six-stage
  loader being visible in order. Written now; run pre-deploy per AGENTS.md rule 3 as
  amended.
- Both suites must pass locally before the PR opens.

## Dependencies

- Depends on issue 0003 (Prisma models, `fieldProfile.create`, `geocode.search`
  contracts).
- Files disjoint from issues 0005 (`src/lib/weather/*`, weather router) and 0006
  (`src/lib/ai/*`, recommendation router, cultura/soi screens) — safe to run in parallel
  with them once 0003 is merged.
