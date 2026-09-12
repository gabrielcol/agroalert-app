---
status: Todo
branch: feat/weather-brief-client
created: 2026-09-12
---

# Weather Brief: Open-Meteo client, aggregation and cache

## Description

Issue 0003 froze the Weather Brief contract (`ClimateProfile`, `CurrentSeason`,
`Forecast`, `SeasonalOutlook`) and the `WeatherCell` cache model. This issue implements
the real Open-Meteo client, the aggregation from raw daily series into those types, and
the `WeatherCell` cache, so `weather.brief` returns real data instead of a stub.

**Branches off `main` only after issue 0003 has merged.** Files are disjoint from issues
0004 and 0006: this issue owns `src/lib/weather/*` and the weather router only.

## Scope

**In**

- **Historical (Climate Profile / Current Season)**: Open-Meteo archive API, ERA5-Land,
  daily variables `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`,
  `et0_fao_evapotranspiration` plus whatever else the aggregation needs. Pull ten full
  calendar years (Jan 1 of year-10 through Dec 31 of last year) plus the current year to
  date, accounting for ERA5-Land's ~5-day latency. `temperature_2m_mean` is not
  guaranteed by the archive API — compute it from max/min when absent. GDD (base 5 and
  base 10) computed from max/min.
- Aggregation of the historical pull into `ClimateProfile` and `CurrentSeason` exactly per
  the frozen Zod shapes from issue 0003.
- **Forecast**: forecast API, `forecast_days=16`, `past_days=30` for the last-30-days
  block of `CurrentSeason`; daily variables plus hourly soil layers aggregated to daily
  0-9 cm (`soilTemp0_9cm`, `soilMoisture0_9cm`).
- **Seasonal Outlook**: seasonal API, ECMWF EC46, weekly aggregation for weeks 3-7,
  anomalies computed against the Climate Profile's monthly normals, labelled
  (`warmer`/`colder`/`wetter`/`drier`) and flagged `confidence: "low"`.
- `WeatherCell` cache per 0.1° cell: Climate Profile refreshed monthly, Forecast and
  Seasonal Outlook on a 6-hour TTL. Only the aggregate is stored — never the raw daily
  series.
- Typed failure: any Open-Meteo call failing or rate-limited throws a typed error (e.g.
  `WeatherFetchError`); no degraded/partial Weather Brief is ever returned.
- `weather.brief(fieldProfileId)` implemented for real: resolve the field's cell, serve
  from cache within TTL, otherwise fetch, aggregate, cache, and return.

**Out**

- Any UI for the retry screen shown on failure — that is issue 0006's / the cultura
  step's concern where it consumes `weather.brief`; this issue only guarantees the typed
  error is thrown.
- API keys, attribution UI, or paid-tier handling — free tier only, per ADR 0003.
- Any change to `src/lib/ai/*`, `teren-screen.tsx`, `cultura-screen.tsx`, or `soi-screen.tsx`.

## Acceptance criteria

- [ ] The archive-API client requests the correct ten-full-year + YTD window and the
      documented daily variables, with `latitude`/`longitude` from the Field Location.
- [ ] `temperature_2m_mean` is computed from max/min when the API omits it.
- [ ] GDD base 5 and base 10 are computed per month from max/min and match a hand-checked
      fixture.
- [ ] `ClimateProfile` output includes monthly normals, frost/heat stats (per-year and
      10-year mean + spread), GDD per month at both bases, and the per-year table
      (`annualPrecip`, `summerPrecip`, `driest60DayWindow`, `droughtFlag`).
- [ ] `CurrentSeason` includes YTD monthly actuals + anomaly vs. normals and the last 30
      days day by day.
- [ ] The forecast client requests `forecast_days=16` and `past_days=30`, and
      `Forecast` has exactly 16 daily rows with all documented fields, including
      0-9 cm soil temperature/moisture aggregated from hourly.
- [ ] The seasonal client requests EC46, and `SeasonalOutlook` covers weeks 3-7 with
      `tempAnomaly`/`precipAnomaly`/`label`/`confidence: "low"` computed against the
      Climate Profile's own normals (not a separate baseline).
- [ ] `WeatherCell` rows are keyed by `(latCell, lngCell)` rounded to 0.1°; a second
      request for a point in the same cell within TTL does not re-fetch Open-Meteo.
- [ ] Climate Profile cache entries are treated stale after 1 month; Forecast and
      Seasonal Outlook after 6 hours.
- [ ] A failing or rate-limited Open-Meteo call raises a typed error and `weather.brief`
      never returns a partially-populated Weather Brief.
- [ ] The Open-Meteo client accepts an injected `fetch`, so tests run with no network
      access.

## Tests required

- **Vitest**: aggregation unit tests against recorded Open-Meteo JSON fixtures (checked
  into `src/lib/weather/__fixtures__/` or similar) for Climate Profile, Current Season,
  Forecast and Seasonal Outlook, including the `temperature_2m_mean`-absent case and a
  known drought year producing `droughtFlag: true`; cache-hit/cache-miss/TTL-expiry tests
  against `WeatherCell` with a fake clock; typed-error tests for a non-2xx and a
  rate-limited (429) response.
- **Playwright**: none directly — no new screen. If the cultura/rezumat retry screen from
  issue 0006 depends on this issue's error type, that e2e coverage lives in 0006. State
  in the PR whether this issue is otherwise UI-exempt under AGENTS.md rule 3, or add a
  minimal e2e smoke test if a route directly surfaces `weather.brief`.

## Dependencies

- Depends on issue 0003 (`WeatherCell` model, `WeatherBrief`/`ClimateProfile`/
  `CurrentSeason`/`Forecast`/`SeasonalOutlook` Zod contracts, `weather.brief` stub).
- Files disjoint from issues 0004 (teren-screen, loading-screen, geocode router) and 0006
  (`src/lib/ai/*`, recommendation router, cultura/soi screens) — safe to run in parallel
  with them once 0003 is merged.
