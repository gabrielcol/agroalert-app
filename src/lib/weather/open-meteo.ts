import { TIMEZONE } from "./schema";

/**
 * Open-Meteo HTTP client (free tier, no key). Three endpoints:
 *
 * - archive: ERA5-Land temperatures blended with ERA5 precipitation/ET0 —
 *   the API's default model set. `models=era5_land` alone returns null
 *   precipitation and ET0 (verified 2026-09-12), so the default is used.
 * - forecast: 16 days ahead plus 30 past days, daily + hourly soil layers.
 * - seasonal: ECMWF EC46, 46 days, control run plus 50 ensemble members.
 *
 * `fetch` is injected so tests never touch the network. Any transport or
 * non-2xx failure becomes a `WeatherUnavailableError`; callers must never
 * build a partial Weather Brief from it (ADR 0003).
 */

export const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const SEASONAL_URL = "https://seasonal-api.open-meteo.com/v1/seasonal";

export const ARCHIVE_DAILY = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
] as const;

export const FORECAST_DAILY = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "et0_fao_evapotranspiration",
  "wind_gusts_10m_max",
  "snowfall_sum",
  "weather_code",
] as const;

/** Nearest layers to the 0-9 cm band the Forecast contract asks for. */
export const FORECAST_HOURLY = [
  "soil_temperature_6cm",
  "soil_moisture_3_to_9cm",
] as const;

export const SEASONAL_DAILY = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
] as const;

export const SEASONAL_MODEL = "ecmwf_ec46";
export const FORECAST_DAYS_REQUESTED = 16;
export const FORECAST_PAST_DAYS = 30;
export const SEASONAL_DAYS = 46;

export type Series = (number | null)[];

export type ArchiveResponse = {
  daily: { time: string[] } & Partial<
    Record<(typeof ARCHIVE_DAILY)[number], Series>
  >;
};

export type ForecastResponse = {
  daily: { time: string[] } & Partial<
    Record<(typeof FORECAST_DAILY)[number], Series>
  >;
  hourly: { time: string[] } & Partial<
    Record<(typeof FORECAST_HOURLY)[number], Series>
  >;
};

/** Control run columns are unsuffixed; members are `<var>_member01..50`. */
export type SeasonalResponse = {
  daily: { time: string[] } & Record<string, Series | string[]>;
};

export class WeatherUnavailableError extends Error {
  readonly endpoint: string;
  readonly status: number | null;
  constructor(endpoint: string, status: number | null, message: string) {
    super(`Open-Meteo ${endpoint} unavailable: ${message}`);
    this.name = "WeatherUnavailableError";
    this.endpoint = endpoint;
    this.status = status;
  }
}

export type Point = { lat: number; lng: number };

export function archiveUrl(
  point: Point,
  startDate: string,
  endDate: string,
): string {
  const q = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    start_date: startDate,
    end_date: endDate,
    daily: ARCHIVE_DAILY.join(","),
    timezone: TIMEZONE,
  });
  return `${ARCHIVE_URL}?${q}`;
}

export function forecastUrl(point: Point): string {
  const q = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    forecast_days: String(FORECAST_DAYS_REQUESTED),
    past_days: String(FORECAST_PAST_DAYS),
    daily: FORECAST_DAILY.join(","),
    hourly: FORECAST_HOURLY.join(","),
    timezone: TIMEZONE,
  });
  return `${FORECAST_URL}?${q}`;
}

export function seasonalUrl(point: Point): string {
  const q = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    daily: SEASONAL_DAILY.join(","),
    models: SEASONAL_MODEL,
    forecast_days: String(SEASONAL_DAYS),
    timezone: TIMEZONE,
  });
  return `${SEASONAL_URL}?${q}`;
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

export type OpenMeteoClient = {
  archive(
    point: Point,
    startDate: string,
    endDate: string,
  ): Promise<ArchiveResponse>;
  forecast(point: Point): Promise<ForecastResponse>;
  seasonal(point: Point): Promise<SeasonalResponse>;
};

async function getJson<T>(
  fetchImpl: FetchLike,
  endpoint: string,
  url: string,
): Promise<T> {
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new WeatherUnavailableError(
      endpoint,
      null,
      err instanceof Error ? err.message : "network error",
    );
  }
  if (!res.ok) {
    throw new WeatherUnavailableError(
      endpoint,
      res.status,
      res.status === 429 ? "rate limited" : `HTTP ${res.status}`,
    );
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new WeatherUnavailableError(endpoint, res.status, "invalid JSON");
  }
  if (
    typeof body !== "object" ||
    body === null ||
    (body as { error?: boolean }).error === true
  ) {
    throw new WeatherUnavailableError(
      endpoint,
      res.status,
      (body as { reason?: string })?.reason ?? "error response",
    );
  }
  return body as T;
}

export function createOpenMeteoClient(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): OpenMeteoClient {
  return {
    archive: (point, startDate, endDate) =>
      getJson<ArchiveResponse>(
        fetchImpl,
        "archive",
        archiveUrl(point, startDate, endDate),
      ),
    forecast: (point) =>
      getJson<ForecastResponse>(fetchImpl, "forecast", forecastUrl(point)),
    seasonal: (point) =>
      getJson<SeasonalResponse>(fetchImpl, "seasonal", seasonalUrl(point)),
  };
}
