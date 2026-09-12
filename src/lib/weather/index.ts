/**
 * Server-side entry point for the Weather Brief (issue 0005). The
 * recommendation flow (issue 0006) imports `getWeatherBrief` from here; the
 * wizard's loading screen (issue 0011) warms one cache slice per step through
 * `refreshClimateProfile` / `refreshForecast`.
 */
export {
  getWeatherBrief,
  refreshClimateProfile,
  refreshForecast,
  FieldProfileNotFoundError,
  CLIMATE_TTL_MS,
  SHORT_TTL_MS,
  type WeatherBriefDeps,
  type WeatherCacheStatus,
  type WeatherDb,
} from "./brief";
export { WeatherUnavailableError, createOpenMeteoClient } from "./open-meteo";
export * from "./schema";
