---
status: accepted
---

# 0003. Open-Meteo is the only weather source; the Weather Brief is aggregated, cached, and fails hard

Date: 2026-09-12

## Context

The wizard prototype has no Field Location, no forecast, and no answer to how far ahead
the product can honestly speak. ADR 0001 fixed the pitch's promise at 7 days and left the
data source unresolved. Building the real data model (issue 0003) forces the question.

Open-Meteo's free tier gives the whole pipeline in one place, with real limits:

- **Forecast API**: `forecast_days` caps at 16; only the first 7 days are dense-model
  quality, matching ADR 0001's original 7-day promise.
- **Seasonal API (ECMWF EC46)**: weekly tendencies out to 46 days, but as an area-level
  anomaly signal, not a local forecast — useful only as low-confidence tendency.
- **Archive API (ERA5-Land)**: 11 km reanalysis grid, ~5-day latency, but a full,
  free, global historical record — enough to build ten-year normals per Field Location.
- **Geocoding API**: free, RO-scoped search, plus the browser's own geolocation for a
  direct coordinate.
- **Free-tier call weighting**: an uncached ten-year historical pull costs roughly 260
  call-equivalents. At the pitch's traffic this is affordable once, not on every request.

None of this is commercial-grade (Open-Meteo's non-commercial licence, see Consequences),
but it is open, keyless, and covers history, forecast and seasonal tendency from a single
vendor — which is what the organiser's "open data" criterion and the one-day timeline
both want.

## Decision

**Open-Meteo is the only weather source.** Field Location is resolved by the Open-Meteo
Geocoding API or the browser's geolocation — never typed coordinates.

The **Climate Profile** is ten full calendar years of ERA5-Land, aggregated (monthly
normals, frost/heat stats, GDD, a per-year drought table) — never handed to the model as
raw daily series.

The **Forecast** stays 16 days, with the first 7 days named as the trusted part, per ADR 0001.

The **Seasonal Outlook** is EC46 weeks 3-7, expressed as anomalies against the Climate
Profile's own monthly normals, always labelled `confidence: "low"` and always presented
as area tendency, never as a local forecast.

The **Weather Brief** — the bundle the AI actually reads — is the aggregated JSON of all
four pieces, a few KB, never the raw daily series a ten-year pull produces. It is cached
per 0.1° cell in `WeatherCell` (Climate Profile monthly, Forecast/Outlook 6-hour TTL) so
the ~260 call-equivalent historical pull happens once per cell, not once per farmer.

**Any Open-Meteo failure or rate limit is a hard failure.** The Weather Brief is either
complete or the call throws; there is no degraded or partial recommendation. The UI shows
a retry screen.

Free tier, no API key, no attribution UI — acceptable for the hackathon; revisited if the
product continues past it.

## Alternatives considered

- **Hand the model raw daily series** instead of an aggregate: rejected — a ten-year pull
  is tens of thousands of daily rows, blows the prompt budget, and pushes normal-vs.-
  anomaly arithmetic onto the model instead of doing it once, deterministically, in code.
- **Keep the 7-day-only promise from ADR 0001** and add nothing past it: rejected — a
  16-day forecast and a labelled, low-confidence 46-day tendency cost nothing extra from
  the same vendor and let the Crop Recommendation's Sowing Window candidacy rule (open now
  or opening within the outlook horizon) exist at all; the 7-day trust boundary is kept,
  not removed.
- **ECMWF IFS at 9 km since 2017** instead of ERA5-Land: rejected — shorter history than
  the ten full years the Climate Profile wants, and no material accuracy gain at this
  grid scale for a per-parcel Romanian normal.
- **Degrade gracefully on a failed fetch** (last cached value, or a partial brief):
  rejected — a recommendation built on stale or partial weather is worse than no
  recommendation, and silently degrading defeats the "no invented numbers" discipline ADR
  0002 already commits to for the Crop Dictionary.
- **A commercial Open-Meteo key**: rejected for now — the free tier's call weighting is
  exactly why the cache exists; a key is a cost decision to make only if the product
  survives the pitch.

## Consequences

- Open-Meteo's non-commercial licence means this pipeline cannot ship as-is behind a paid
  product without a commercial key; that is a post-pitch decision, not one this ADR makes.
- The cache is load-bearing, not an optimisation: without it, a handful of farmers in
  different cells could burn the free tier's daily budget on historical pulls alone.
- ADR 0001's "the product promises nothing past 7 days" is amended, not reversed: the
  Forecast still trusts only 7 days, but a labelled, low-confidence 46-day tendency is now
  shown. See the amendment on ADR 0001.
- Every Sowing Window candidacy check (Crop Recommendation) and every Alert (Sowing Plan)
  downstream now depends on Open-Meteo's uptime with no fallback vendor; a sustained
  Open-Meteo outage takes the whole recommendation flow down with it, by design.
