---
status: In Review
branch: feat/weather-brief-foundation
created: 2026-09-12
---

# Foundation: Weather Brief and recommendation data model

## Description

The wizard prototype (issues 0001, 0002) runs on `SAMPLE_PLANS` mock data with no Field
Location, no weather, and no AI call. This issue lays the shared substrate the next three
issues build on, per AGENTS.md rule 10: the Prisma models, the frozen Weather Brief and
recommendation Zod contracts, the tRPC router surface (stubs allowed), env vars, reserved
i18n namespaces, and the Crop Dictionary build script — nothing that touches a real
screen.

No feature branch may change these contracts once issues 0004-0006 fan out; a contract
change belongs here or in a follow-up foundation task.

**Branches off `main` only after issue 0001 has merged** (per AGENTS.md rule 10: this is
the shared foundation, so it must land on an up-to-date `main` before 0004/0005/0006 are
cut). It must not stack on `feat/wizard-content-refinements` or
`feat/sticky-header-cta-bar`.

## Scope

**In**

- Prisma models: `FieldProfile`, `WeatherCell`, `CropRecommendation`,
  `VarietyRecommendation` (see below), SQLite, indefinite retention, no soft delete.
- Zod schemas for the Weather Brief payload and for the Crop Recommendation /
  Variety Recommendation output shapes — the frozen contracts.
- tRPC router surface with stub implementations: `fieldProfile.create`,
  `fieldProfile.get`, `geocode.search`, `weather.brief`, `recommendation.crops`,
  `recommendation.varieties`.
- `ANTHROPIC_API_KEY` and `AI_MODEL` added to `src/env.ts` and `.env.example`.
- i18n key namespaces reserved (empty or placeholder strings) in
  `src/lib/i18n/dictionaries/{ro,en}.ts` for: Soil Class options, the loader's
  "location" step, Crop Recommendation cards, Variety Recommendation ranking.
- Build-time script that strips `{value, source, verified}` provenance wrappers from
  `resources/culturi/crop-dictionary.json` into a compact dictionary for the model
  prompt (drop `economics` unless a later issue needs it), plus a unit test.
- ADR 0003 (new) and an amendment to ADR 0001.

**Out**

- Real geocoding, weather fetching, or AI calls — routers are stubs (throw
  `NOT_IMPLEMENTED` or return fixture data), implemented in 0004/0005/0006.
- Any change to `teren`, `cultura`, `soi`, `rezumat` screens.
- Postgres migration (still SQLite, per README "Switching to Postgres").

## Data model

```
FieldProfile
  id            String   @id @default(cuid())
  villageName   String
  lat           Float
  lng           Float
  landBucket    String   // "small" | "medium" | "large" (under 5 / 5-10 / over 10 ha)
  irrigation    Boolean
  soilClass     String   // "cernoziom" | "lutos" | "argilos" | "nisipos" | "unknown"
  createdAt     DateTime @default(now())

WeatherCell        // cache keyed by (latCell, lngCell), rounded to 0.1°
  id                String   @id @default(cuid())
  latCell           Float
  lngCell           Float
  climateProfile    Json?
  climateFetchedAt  DateTime?
  forecast          Json?
  forecastFetchedAt DateTime?
  outlook           Json?
  outlookFetchedAt  DateTime?
  sourceDataset     String?  // e.g. "ERA5-Land", "EC46"
  sourceSpan        String?  // e.g. "2016-01-01..2026-09-12"
  @@unique([latCell, lngCell])

CropRecommendation
  id              String   @id @default(cuid())
  fieldProfileId  String
  weatherBrief    Json     // Weather Brief snapshot at recommendation time
  result          Json     // Crop Recommendation output (Zod-validated on write)
  modelId         String
  createdAt       DateTime @default(now())

VarietyRecommendation
  id                    String   @id @default(cuid())
  cropRecommendationId  String
  cropId                String
  result                Json     // Variety Recommendation output (Zod-validated)
  modelId               String
  createdAt             DateTime @default(now())
```

## Zod contracts (frozen)

**Weather Brief** (`src/lib/weather/schema.ts` or equivalent — exact path decided during
implementation, but the shape below does not change without a foundation follow-up):

- `ClimateProfile`: monthly normals (`tMean`, `tMin`, `tMax`, `precipSum`, `et0`,
  `waterBalance`); frost/heat stats per year and a 10-year mean + spread
  (`lastSpringFrost`, `firstAutumnFrost`, `frostDays`, `daysOver30`, `daysOver35`); GDD per
  month at base 5 and base 10; a per-year table (`annualPrecip`, `summerPrecip`,
  `driest60DayWindow`, `droughtFlag`).
- `CurrentSeason`: year-to-date monthly actuals + anomaly vs. the Climate Profile normals,
  plus the last 30 days day by day.
- `Forecast`: 16 daily rows — `tMax`, `tMin`, `precipSum`, `precipProbability`, `et0`,
  `waterBalance`, `soilTemp0_9cm`, `soilMoisture0_9cm`, `windGustsMax`, `snowfallSum`,
  `weatherCode`.
- `SeasonalOutlook`: weeks 3-7 — `tempAnomaly`, `precipAnomaly`, `label`
  (`"warmer" | "colder" | "wetter" | "drier"`), `confidence: "low"`.
- `WeatherBrief`: `{ climateProfile, currentSeason, forecast, seasonalOutlook, today,
timezone: "Europe/Bucharest", units: "metric" }`.

**Crop Recommendation output**: top 3 — `cropId` (from the Crop Dictionary), `fit` (0-100),
`reasons: string[]` (ro), `risks: string[]` (ro), `sowingWindow: { from, to }`,
`recommendedVarietyIds: string[]`, `confidence`; plus `excluded: { cropId, reason }[]`.

**Variety Recommendation output**: every Variety of one Crop in the Crop Dictionary,
ranked — `varietyName`, `fit`, `reasons: string[]`.

## tRPC router surface (contracts only, stub implementations allowed)

- `fieldProfile.create(input) => FieldProfile`
- `fieldProfile.get({ id }) => FieldProfile`
- `geocode.search({ query }) => { name, lat, lng }[]`
- `weather.brief({ fieldProfileId }) => WeatherBrief`
- `recommendation.crops({ fieldProfileId }) => CropRecommendation`
- `recommendation.varieties({ cropRecommendationId, cropId }) => VarietyRecommendation`

## Acceptance criteria

- [ ] `prisma/schema.prisma` has `FieldProfile`, `WeatherCell`, `CropRecommendation`,
      `VarietyRecommendation` as above, with a migration under `prisma/migrations/`.
- [ ] `WeatherCell` is unique on `(latCell, lngCell)`.
- [ ] Zod schemas exist for `ClimateProfile`, `CurrentSeason`, `Forecast`,
      `SeasonalOutlook`, `WeatherBrief`, the Crop Recommendation output and the Variety
      Recommendation output, matching the shapes above exactly.
- [ ] The six tRPC procedures exist on the router with the input/output types above;
      stub bodies are acceptable but must type-check against the Zod contracts.
- [ ] `ANTHROPIC_API_KEY` (required, server-only) and `AI_MODEL` (required, server-only,
      default a Sonnet-class model id verified against the Claude API reference at
      implementation time) are in `src/env.ts` and documented in `.env.example`.
- [ ] `src/lib/i18n/dictionaries/ro.ts` and `en.ts` reserve keys for: Soil Class options,
      the loader's "location" step label, Crop Recommendation cards, Variety
      Recommendation ranking — RO/EN parity on key names.
- [ ] A build-time script (e.g. `scripts/build-crop-dictionary.ts`) reads
      `resources/culturi/crop-dictionary.json`, strips every `{value, source, verified}`
      wrapper down to `value` (dropping `economics` unless a consumer needs it), and
      writes a compact dictionary artifact.
- [ ] Unit test on the strip script covering a nested `{value, source, verified}` leaf, a
      missing field, and a `varieties[]` array.
- [ ] ADR 0003 exists at `docs/adr/0003-weather-brief-from-open-meteo.md`.
- [ ] ADR 0001 carries the "Amended 2026-09-12" note described in ADR 0003's task.
- [ ] `bun run typecheck`, `bun run lint` and `bun test` (Vitest) pass locally.

## Tests required

- **Vitest**: Zod schema round-trip tests (valid Weather Brief and recommendation
  fixtures parse; a malformed fixture — e.g. missing `confidence`, wrong `label` enum
  value — is rejected); the crop-dictionary strip script unit test above; stub router
  procedures resolve with the declared output shape (using a fixture, not a real fetch or
  API key).
- **Playwright**: none — this issue has no UI surface. Exempt under AGENTS.md rule 3
  ("no runtime surface"), state the exemption in the PR.

## Dependencies

- None beyond issue 0001 having merged to `main`.
- Blocks issues 0004, 0005, 0006 — none of them may branch until this merges to `main`.
