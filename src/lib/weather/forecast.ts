import type { ForecastResponse } from "./open-meteo";
import { WeatherUnavailableError } from "./open-meteo";
import { FORECAST_DAYS, TRUSTED_FORECAST_DAYS, type Forecast } from "./schema";

/**
 * Forecast: the daily rows from today onwards, up to 16. Hourly soil layers
 * are averaged per day; the model stops publishing soil variables before day
 * 16, so a missing day carries the last known value forward (persistence).
 *
 * The request is made in Europe/Bucharest but Open-Meteo's horizon is anchored
 * to UTC, so between local midnight and ~03:00 the last local day comes back
 * with every core value null. Those trailing rows are beyond the horizon, not
 * missing: they are dropped and the Forecast ends where the model ends, as
 * long as `TRUSTED_FORECAST_DAYS` complete days remain (issue 0009). A null
 * row followed by a filled one is a real gap and still fails.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function dailyMeans(
  hourlyTime: string[],
  series: (number | null)[] | undefined,
): Map<string, number> {
  const acc = new Map<string, { sum: number; n: number }>();
  if (!series) return new Map();
  for (let i = 0; i < hourlyTime.length; i++) {
    const v = series[i];
    if (v === null || v === undefined) continue;
    const day = hourlyTime[i].slice(0, 10);
    const a = acc.get(day) ?? { sum: 0, n: 0 };
    a.sum += v;
    a.n += 1;
    acc.set(day, a);
  }
  return new Map([...acc].map(([d, a]) => [d, a.sum / a.n]));
}

export function buildForecast(
  res: ForecastResponse,
  today: string,
  issuedAt: Date,
): Forecast {
  const d = res.daily;
  const start = d.time.indexOf(today);
  if (start < 0 || d.time.length - start < FORECAST_DAYS) {
    throw new WeatherUnavailableError(
      "forecast",
      null,
      `forecast does not cover ${FORECAST_DAYS} days from ${today}`,
    );
  }
  const soilTemp = dailyMeans(res.hourly.time, res.hourly.soil_temperature_6cm);
  const soilMoisture = dailyMeans(
    res.hourly.time,
    res.hourly.soil_moisture_3_to_9cm,
  );
  let lastTemp: number | undefined;
  let lastMoisture: number | undefined;
  // Seed persistence from the most recent past day with soil data.
  for (let i = 0; i < start; i++) {
    lastTemp = soilTemp.get(d.time[i]) ?? lastTemp;
    lastMoisture = soilMoisture.get(d.time[i]) ?? lastMoisture;
  }

  const window = d.time.slice(start, start + FORECAST_DAYS);
  // null = beyond the model horizon (every core value missing).
  const core = window.map((date, k) => {
    const i = start + k;
    const tMax = d.temperature_2m_max?.[i] ?? null;
    const tMin = d.temperature_2m_min?.[i] ?? null;
    const precipSum = d.precipitation_sum?.[i] ?? null;
    const et0 = d.et0_fao_evapotranspiration?.[i] ?? null;
    if (tMax === null && tMin === null && precipSum === null && et0 === null) {
      return null;
    }
    if (tMax === null || tMin === null || precipSum === null || et0 === null) {
      throw new WeatherUnavailableError(
        "forecast",
        null,
        `missing daily values on ${date}`,
      );
    }
    return { tMax, tMin, precipSum, et0 };
  });

  const horizon = core.findIndex((c) => c === null);
  const complete = horizon < 0 ? core.length : horizon;
  if (horizon >= 0 && core.slice(horizon).some((c) => c !== null)) {
    throw new WeatherUnavailableError(
      "forecast",
      null,
      `gap in the daily series on ${window[horizon]}`,
    );
  }
  if (complete < TRUSTED_FORECAST_DAYS) {
    throw new WeatherUnavailableError(
      "forecast",
      null,
      `only ${complete} complete days from ${today}, need ${TRUSTED_FORECAST_DAYS}`,
    );
  }

  const days = window.slice(0, complete).map((date, k) => {
    const { tMax, tMin, precipSum, et0 } = core[k]!;
    const i = start + k;
    lastTemp = soilTemp.get(date) ?? lastTemp;
    lastMoisture = soilMoisture.get(date) ?? lastMoisture;
    if (lastTemp === undefined || lastMoisture === undefined) {
      throw new WeatherUnavailableError(
        "forecast",
        null,
        "no soil data in forecast",
      );
    }
    return {
      date,
      tMax,
      tMin,
      precipSum,
      precipProbability: d.precipitation_probability_max?.[i] ?? 0,
      et0,
      waterBalance: round1(precipSum - et0),
      soilTemp0_9cm: round1(lastTemp),
      soilMoisture0_9cm: round3(Math.min(1, Math.max(0, lastMoisture))),
      windGustsMax: d.wind_gusts_10m_max?.[i] ?? 0,
      snowfallSum: d.snowfall_sum?.[i] ?? 0,
      weatherCode: d.weather_code?.[i] ?? 0,
    };
  });

  return {
    issuedAt: issuedAt.toISOString(),
    trustedDays: TRUSTED_FORECAST_DAYS,
    days,
  };
}
