---
status: In Review
branch: fix/forecast-trailing-null-days
created: 2026-09-13
---

# Forecast breaks on trailing null days past the Open-Meteo horizon

## Description

`recommendation.crops` fails with `WEATHER_UNAVAILABLE` for every field between local
midnight and roughly 03:00 Europe/Bucharest. Nothing about the request is wrong — the
Forecast builder is stricter than the upstream data.

Root cause, in order:

1. `src/lib/weather/open-meteo.ts` asks the forecast endpoint for
   `forecast_days=16` with `timezone=Europe/Bucharest`. Open-Meteo's model horizon is
   anchored to UTC, so while Bucharest is already on the next local day but UTC is not,
   the 16th local day exists as a row with `null` `temperature_2m_max`,
   `temperature_2m_min`, `precipitation_sum` and `et0_fao_evapotranspiration` (only
   `precipitation_probability_max` is filled in — it is a climatological field).
2. `buildForecast` (`src/lib/weather/forecast.ts`) requires all `FORECAST_DAYS = 16` rows
   to be complete and throws `WeatherUnavailableError("forecast", null, "missing daily
values on <date>")` on the first null it meets.
3. `forecastSchema.days` (`src/lib/weather/schema.ts`) is `.length(FORECAST_DAYS)`, so
   even a 15-day Forecast would not parse.
4. The failure is invisible to an operator: the tRPC fetch handler in
   `src/app/api/trpc/[trpc]/route.ts` has no `onError`, so the `cause` chain carefully
   attached in `src/lib/ai/service.ts` and `src/server/routers/recommendation.ts` is
   never logged — only the `WEATHER_UNAVAILABLE` code reaches the client.
5. Because `getWeatherBrief` writes the `weather_cell` cache only after every piece
   succeeds (`src/lib/weather/brief.ts`), the cache stays empty during the window and
   every request re-hits Open-Meteo and re-fails.

A day past the horizon is not missing data, it is data that does not exist yet. The
Forecast should end where the model ends, as long as it still covers the part of the
Forecast the product trusts (`TRUSTED_FORECAST_DAYS = 7`).

## Scope

**In**

- `buildForecast`: drop trailing days whose core fields (tMax, tMin, precipSum, et0) are
  all null as "beyond horizon". Still throw on a real interior gap (a null day followed
  by a non-null day) and when fewer than `TRUSTED_FORECAST_DAYS` complete days remain.
- `forecastSchema.days`: `.min(TRUSTED_FORECAST_DAYS).max(FORECAST_DAYS)` instead of
  `.length(FORECAST_DAYS)`. The `forecast` JSON column shape is otherwise unchanged.
- Consumers that assumed exactly 16 days (unit tests, contract tests) tolerate 15.
- `onError` on `fetchRequestHandler` logging `path`, `error.code`, `error.message` and,
  when `error.cause` is an `Error`, its `name`, `message` and the `endpoint`/`status`
  fields a `WeatherUnavailableError` carries.

**Out**

- Changing the request (`forecast_days`, `timezone`) — the 16-day ask stays; whether to
  anchor the request to UTC is a separate decision.
- Widening the `weather_cell` cache write to partial briefs (ADR 0003: nothing partial is
  written or returned).
- Structured logging / a logger dependency; `console.error` is enough for the hackathon.

## Acceptance criteria

- [ ] A response whose last local day carries null tMax/tMin/precip/et0 builds a Forecast
      of 15 days instead of throwing.
- [ ] A null day followed by a non-null day (a real gap) still throws
      `WeatherUnavailableError`.
- [ ] Fewer than `TRUSTED_FORECAST_DAYS` complete days still throws.
- [ ] `forecastSchema` accepts 15 days, rejects 14 and rejects 17.
- [ ] A failing tRPC call logs the path, the code, the message and the `cause` chain
      (name, message, endpoint, status) through `console.error`.
- [ ] Per-task gate green: typecheck, lint, prettier, Vitest.

## Tests required

- **Vitest**: `buildForecast` with a trailing null day (15 days returned), with an
  interior gap (throws), with too few complete days (throws); `forecastSchema` accepting
  15 and rejecting 14 and 17.
- **Playwright**: not extended — the change is a data-shape edge case with no new runtime
  surface; the existing recommendation specs already cover the happy path (AGENTS.md
  rule 3 exemption noted in the changelog).

## Dependencies

- None. Branches off `main` after issue 0008.
