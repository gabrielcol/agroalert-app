import { z } from "zod";

/**
 * Weather Brief contract — the bundle handed to the AI for one Field Profile
 * (CONTEXT.md: Climate Profile, Current Season, Forecast, Seasonal Outlook,
 * Weather Brief). Frozen in issue 0003; issue 0005 produces it from
 * Open-Meteo, issue 0006 consumes it. Change it only in a foundation task.
 *
 * Units are metric throughout: °C, mm, mm/day for ET0, m³/m³ for soil
 * moisture, km/h for gusts, cm for snowfall. Dates are ISO `YYYY-MM-DD` in
 * Europe/Bucharest.
 */

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const monthSchema = z.number().int().min(1).max(12);
export const yearSchema = z.number().int().min(1900).max(2200);

export const TIMEZONE = "Europe/Bucharest" as const;
export const UNITS = "metric" as const;
export const FORECAST_DAYS = 16 as const;
/** The part of the Forecast the product trusts (ADR 0001, amended). */
export const TRUSTED_FORECAST_DAYS = 7 as const;
export const OUTLOOK_WEEKS = [3, 4, 5, 6, 7] as const;

// ---------------------------------------------------------------------------
// Climate Profile — ten full calendar years, aggregated
// ---------------------------------------------------------------------------

export const monthlyNormalSchema = z.object({
  month: monthSchema,
  /** mean of daily mean temperature, °C */
  tMean: z.number(),
  /** mean of daily minimum temperature, °C */
  tMin: z.number(),
  /** mean of daily maximum temperature, °C */
  tMax: z.number(),
  /** mean monthly precipitation, mm */
  precipSum: z.number(),
  /** mean monthly FAO ET0, mm */
  et0: z.number(),
  /** precipSum - et0, mm */
  waterBalance: z.number(),
});
export type MonthlyNormal = z.infer<typeof monthlyNormalSchema>;

export const frostHeatYearSchema = z.object({
  year: yearSchema,
  /** last day with tMin <= 0 °C in Jan-Jun, or null if none */
  lastSpringFrost: isoDateSchema.nullable(),
  /** first day with tMin <= 0 °C in Jul-Dec, or null if none */
  firstAutumnFrost: isoDateSchema.nullable(),
  frostDays: z.number().int().nonnegative(),
  daysOver30: z.number().int().nonnegative(),
  daysOver35: z.number().int().nonnegative(),
});
export type FrostHeatYear = z.infer<typeof frostHeatYearSchema>;

/** Ten-year mean and spread (max - min across the years) of one statistic. */
export const statSpreadSchema = z.object({
  mean: z.number(),
  spread: z.number().nonnegative(),
});

export const frostHeatSummarySchema = z.object({
  /** day-of-year statistics (1-366) over the years that had a frost */
  lastSpringFrostDoy: statSpreadSchema.nullable(),
  firstAutumnFrostDoy: statSpreadSchema.nullable(),
  frostDays: statSpreadSchema,
  daysOver30: statSpreadSchema,
  daysOver35: statSpreadSchema,
});

export const gddMonthSchema = z.object({
  month: monthSchema,
  /** mean growing degree days accumulated in the month, base 5 °C */
  base5: z.number().nonnegative(),
  /** mean growing degree days accumulated in the month, base 10 °C */
  base10: z.number().nonnegative(),
});
export type GddMonth = z.infer<typeof gddMonthSchema>;

export const climateYearSchema = z.object({
  year: yearSchema,
  annualPrecip: z.number().nonnegative(),
  /** Jun-Aug precipitation, mm */
  summerPrecip: z.number().nonnegative(),
  driest60DayWindow: z.object({
    from: isoDateSchema,
    to: isoDateSchema,
    precipSum: z.number().nonnegative(),
  }),
  /** true when the year is markedly drier than the ten-year normal */
  droughtFlag: z.boolean(),
});
export type ClimateYear = z.infer<typeof climateYearSchema>;

export const climateProfileSchema = z.object({
  /** e.g. "ERA5-Land" */
  dataset: z.string().min(1),
  /** the ten full calendar years, inclusive */
  span: z.object({ fromYear: yearSchema, toYear: yearSchema }),
  monthlyNormals: z.array(monthlyNormalSchema).length(12),
  frostHeat: z.object({
    perYear: z.array(frostHeatYearSchema).min(1),
    summary: frostHeatSummarySchema,
  }),
  gdd: z.array(gddMonthSchema).length(12),
  years: z.array(climateYearSchema).min(1),
});
export type ClimateProfile = z.infer<typeof climateProfileSchema>;

// ---------------------------------------------------------------------------
// Current Season — the current calendar year to date
// ---------------------------------------------------------------------------

export const currentSeasonMonthSchema = z.object({
  month: monthSchema,
  tMean: z.number(),
  precipSum: z.number(),
  et0: z.number(),
  waterBalance: z.number(),
  /** actual minus the Climate Profile normal for the same month */
  anomaly: z.object({
    tMean: z.number(),
    precipSum: z.number(),
  }),
});

export const dailyActualSchema = z.object({
  date: isoDateSchema,
  tMax: z.number(),
  tMin: z.number(),
  precipSum: z.number(),
  et0: z.number(),
});

export const currentSeasonSchema = z.object({
  year: yearSchema,
  /** through the last available day (ERA5-Land runs ~5 days behind) */
  throughDate: isoDateSchema,
  monthly: z.array(currentSeasonMonthSchema).min(1).max(12),
  last30Days: z.array(dailyActualSchema).min(1).max(30),
});
export type CurrentSeason = z.infer<typeof currentSeasonSchema>;

// ---------------------------------------------------------------------------
// Forecast — 16 daily rows
// ---------------------------------------------------------------------------

export const forecastDaySchema = z.object({
  date: isoDateSchema,
  tMax: z.number(),
  tMin: z.number(),
  precipSum: z.number(),
  /** 0-100 % */
  precipProbability: z.number().min(0).max(100),
  et0: z.number(),
  waterBalance: z.number(),
  /** daily mean soil temperature, 0-9 cm, °C */
  soilTemp0_9cm: z.number(),
  /** daily mean soil moisture, 0-9 cm, m³/m³ */
  soilMoisture0_9cm: z.number().min(0).max(1),
  /** km/h */
  windGustsMax: z.number().nonnegative(),
  /** cm */
  snowfallSum: z.number().nonnegative(),
  /** WMO weather code */
  weatherCode: z.number().int().min(0).max(99),
});
export type ForecastDay = z.infer<typeof forecastDaySchema>;

export const forecastSchema = z.object({
  /** ISO 8601 date-time the forecast was fetched */
  issuedAt: z.string().datetime({ offset: true }),
  trustedDays: z.literal(TRUSTED_FORECAST_DAYS),
  days: z.array(forecastDaySchema).length(FORECAST_DAYS),
});
export type Forecast = z.infer<typeof forecastSchema>;

// ---------------------------------------------------------------------------
// Seasonal Outlook — EC46 weeks 3-7 as anomalies vs the Climate Profile
// ---------------------------------------------------------------------------

export const OUTLOOK_LABELS = ["warmer", "colder", "wetter", "drier"] as const;
export const outlookLabelSchema = z.enum(OUTLOOK_LABELS);

export const outlookWeekSchema = z.object({
  /** week number ahead of today: 3..7 */
  week: z.union([
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  from: isoDateSchema,
  to: isoDateSchema,
  /** weekly mean temperature minus the Climate Profile normal, °C */
  tempAnomaly: z.number(),
  /** weekly precipitation minus the Climate Profile normal, mm */
  precipAnomaly: z.number(),
  /** the dominant tendency of the week */
  label: outlookLabelSchema,
  confidence: z.literal("low"),
});
export type OutlookWeek = z.infer<typeof outlookWeekSchema>;

export const seasonalOutlookSchema = z.object({
  /** e.g. "EC46" */
  dataset: z.string().min(1),
  issuedAt: z.string().datetime({ offset: true }),
  weeks: z.array(outlookWeekSchema).length(OUTLOOK_WEEKS.length),
});
export type SeasonalOutlook = z.infer<typeof seasonalOutlookSchema>;

// ---------------------------------------------------------------------------
// Weather Brief
// ---------------------------------------------------------------------------

export const weatherBriefSchema = z.object({
  today: isoDateSchema,
  timezone: z.literal(TIMEZONE),
  units: z.literal(UNITS),
  location: z.object({ lat: z.number(), lng: z.number() }),
  climateProfile: climateProfileSchema,
  currentSeason: currentSeasonSchema,
  forecast: forecastSchema,
  seasonalOutlook: seasonalOutlookSchema,
});
export type WeatherBrief = z.infer<typeof weatherBriefSchema>;
