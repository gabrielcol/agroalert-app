import { addDays, todayIn } from "./dates";
import {
  FORECAST_DAYS,
  OUTLOOK_WEEKS,
  TIMEZONE,
  TRUSTED_FORECAST_DAYS,
  UNITS,
  type ClimateProfile,
  type CurrentSeason,
  type Forecast,
  type SeasonalOutlook,
  type WeatherBrief,
} from "./schema";

/**
 * A plausible Weather Brief for a field near Reviga, Ialomița, built from a
 * few hand-picked numbers. Used by the stub `weather.brief` procedure until
 * issue 0005 fetches real data, and by contract tests. Not real weather.
 */

const MONTH_T_MEAN = [-1.5, 0.5, 5.5, 11.5, 17, 21, 23.5, 23, 18, 12, 6, 0.5];
const MONTH_PRECIP = [30, 28, 32, 40, 55, 70, 55, 40, 40, 35, 38, 35];
const MONTH_ET0 = [10, 18, 40, 75, 115, 140, 155, 140, 90, 50, 20, 10];

/** Fixture dates derive from "today" so the data never goes stale. */
function defaultToday(): string {
  return todayIn(new Date());
}

export function climateProfileFixture(
  toYear = Number(defaultToday().slice(0, 4)) - 1,
): ClimateProfile {
  const fromYear = toYear - 9;
  const years = Array.from({ length: 10 }, (_, i) => fromYear + i);
  return {
    dataset: "ERA5-Land",
    span: { fromYear, toYear },
    monthlyNormals: MONTH_T_MEAN.map((tMean, i) => ({
      month: i + 1,
      tMean,
      tMin: tMean - 5,
      tMax: tMean + 6,
      precipSum: MONTH_PRECIP[i],
      et0: MONTH_ET0[i],
      waterBalance: MONTH_PRECIP[i] - MONTH_ET0[i],
    })),
    frostHeat: {
      perYear: years.map((year, i) => ({
        year,
        lastSpringFrost: `${year}-04-${String(5 + (i % 7)).padStart(2, "0")}`,
        firstAutumnFrost: `${year}-10-${String(20 + (i % 9)).padStart(2, "0")}`,
        frostDays: 70 + (i % 5) * 4,
        daysOver30: 40 + (i % 6) * 5,
        daysOver35: 8 + (i % 4) * 3,
      })),
      summary: {
        lastSpringFrostDoy: { mean: 98, spread: 12 },
        firstAutumnFrostDoy: { mean: 297, spread: 16 },
        frostDays: { mean: 78, spread: 16 },
        daysOver30: { mean: 52, spread: 25 },
        daysOver35: { mean: 12, spread: 9 },
      },
    },
    gdd: MONTH_T_MEAN.map((tMean, i) => ({
      month: i + 1,
      base5: Math.max(0, tMean - 5) * 30,
      base10: Math.max(0, tMean - 10) * 30,
    })),
    years: years.map((year, i) => ({
      year,
      annualPrecip: 500 - (i % 3) * 90,
      summerPrecip: 165 - (i % 3) * 60,
      driest60DayWindow: {
        from: `${year}-07-10`,
        to: `${year}-09-07`,
        precipSum: 18 + (i % 3) * 14,
      },
      droughtFlag: i % 3 === 2,
    })),
  };
}

export function currentSeasonFixture(today = defaultToday()): CurrentSeason {
  const year = Number(today.slice(0, 4));
  const monthsSoFar = Number(today.slice(5, 7));
  const throughDate = addDays(today, -5);
  const normals = climateProfileFixture(year - 1).monthlyNormals;
  return {
    year,
    throughDate,
    monthly: normals.slice(0, monthsSoFar).map((n) => ({
      month: n.month,
      tMean: n.tMean + 1.2,
      precipSum: n.precipSum * 0.7,
      et0: n.et0 * 1.05,
      waterBalance: n.precipSum * 0.7 - n.et0 * 1.05,
      anomaly: { tMean: 1.2, precipSum: -n.precipSum * 0.3 },
    })),
    last30Days: Array.from({ length: 30 }, (_, i) => ({
      date: addDays(throughDate, i - 29),
      tMax: 27 + ((i * 7) % 6),
      tMin: 13 + ((i * 3) % 5),
      precipSum: i % 9 === 0 ? 6 : 0,
      et0: 3.5 + ((i * 2) % 3) * 0.4,
    })),
  };
}

export function forecastFixture(today = defaultToday()): Forecast {
  return {
    issuedAt: `${today}T06:00:00+03:00`,
    trustedDays: TRUSTED_FORECAST_DAYS,
    days: Array.from({ length: FORECAST_DAYS }, (_, i) => {
      const precipSum = i === 3 || i === 9 ? 8 : 0;
      const et0 = 3.2 - i * 0.05;
      return {
        date: addDays(today, i),
        tMax: 26 - i * 0.4,
        tMin: 12 - i * 0.3,
        precipSum,
        precipProbability: precipSum > 0 ? 70 : 10,
        et0,
        waterBalance: precipSum - et0,
        soilTemp0_9cm: 19 - i * 0.3,
        soilMoisture0_9cm: 0.18 + (precipSum > 0 ? 0.06 : 0),
        windGustsMax: 30 + (i % 4) * 8,
        snowfallSum: 0,
        weatherCode: precipSum > 0 ? 61 : 1,
      };
    }),
  };
}

export function seasonalOutlookFixture(
  today = defaultToday(),
): SeasonalOutlook {
  return {
    dataset: "EC46",
    issuedAt: `${today}T00:00:00+03:00`,
    weeks: OUTLOOK_WEEKS.map((week) => {
      const from = addDays(today, (week - 1) * 7);
      const tempAnomaly = week % 2 === 0 ? 1.4 : -0.6;
      const precipAnomaly = week === 5 ? 9 : -4;
      return {
        week,
        from,
        to: addDays(from, 6),
        tempAnomaly,
        precipAnomaly,
        label:
          Math.abs(tempAnomaly) >= Math.abs(precipAnomaly) / 5
            ? tempAnomaly > 0
              ? ("warmer" as const)
              : ("colder" as const)
            : precipAnomaly > 0
              ? ("wetter" as const)
              : ("drier" as const),
        confidence: "low" as const,
      };
    }),
  };
}

export function weatherBriefFixture(today = defaultToday()): WeatherBrief {
  const year = Number(today.slice(0, 4));
  return {
    today,
    timezone: TIMEZONE,
    units: UNITS,
    location: { lat: 44.7, lng: 27.1 },
    climateProfile: climateProfileFixture(year - 1),
    currentSeason: currentSeasonFixture(today),
    forecast: forecastFixture(today),
    seasonalOutlook: seasonalOutlookFixture(today),
  };
}
