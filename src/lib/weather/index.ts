/**
 * Server-side entry point for the Weather Brief (issue 0005). The
 * recommendation flow (issue 0006) imports `getWeatherBrief` from here.
 */
export {
  getWeatherBrief,
  FieldProfileNotFoundError,
  CLIMATE_TTL_MS,
  SHORT_TTL_MS,
  type WeatherBriefDeps,
  type WeatherDb,
} from "./brief";
export { WeatherUnavailableError, createOpenMeteoClient } from "./open-meteo";
export * from "./schema";
