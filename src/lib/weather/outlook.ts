import { addDays, daysInMonth, monthOf, yearOf } from "./dates";
import type { SeasonalResponse, Series } from "./open-meteo";
import { WeatherUnavailableError } from "./open-meteo";
import {
  OUTLOOK_WEEKS,
  type MonthlyNormal,
  type OutlookWeek,
  type SeasonalOutlook,
} from "./schema";

/**
 * Seasonal Outlook: EC46 weeks 3-7 ahead as anomalies against the Climate
 * Profile's own monthly normals. Values are the ensemble mean over the
 * control run and every member the API returned. Week 7 runs past the 46-day
 * horizon, so it averages the days available. Always `confidence: "low"`:
 * this is an area tendency, never a local forecast (ADR 0003).
 */

export const OUTLOOK_DATASET = "EC46";
/** One degree of temperature anomaly weighs like this share of the normal weekly rain. */
const TEMP_DEGREES_PER_PRECIP_NORMAL = 1;
const MIN_PRECIP_NORMAL_MM = 5;

const round1 = (n: number) => Math.round(n * 10) / 10;

function memberColumns(res: SeasonalResponse, variable: string): Series[] {
  return Object.entries(res.daily)
    .filter(([k]) => k === variable || k.startsWith(`${variable}_member`))
    .map(([, v]) => v as Series);
}

/** Ensemble mean per day, ignoring null members; null when no member has data. */
function ensembleMean(columns: Series[], i: number): number | null {
  let sum = 0;
  let n = 0;
  for (const col of columns) {
    const v = col[i];
    if (v === null || v === undefined) continue;
    sum += v;
    n += 1;
  }
  return n ? sum / n : null;
}

export function weekRange(
  today: string,
  week: number,
): { from: string; to: string } {
  const from = addDays(today, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

export function normalForWeek(normals: MonthlyNormal[], from: string) {
  const mid = addDays(from, 3);
  const month = monthOf(mid);
  const normal = normals[month - 1];
  const weeklyPrecip = (normal.precipSum * 7) / daysInMonth(yearOf(mid), month);
  return { tMean: normal.tMean, weeklyPrecip };
}

export function labelFor(
  tempAnomaly: number,
  precipAnomaly: number,
  weeklyPrecipNormal: number,
): OutlookWeek["label"] {
  const tempScore = Math.abs(tempAnomaly) / TEMP_DEGREES_PER_PRECIP_NORMAL;
  const precipScore =
    Math.abs(precipAnomaly) /
    Math.max(weeklyPrecipNormal, MIN_PRECIP_NORMAL_MM);
  if (tempScore >= precipScore) return tempAnomaly >= 0 ? "warmer" : "colder";
  return precipAnomaly >= 0 ? "wetter" : "drier";
}

export function buildSeasonalOutlook(
  res: SeasonalResponse,
  normals: MonthlyNormal[],
  today: string,
  issuedAt: Date,
): SeasonalOutlook {
  const time = res.daily.time;
  const tMaxCols = memberColumns(res, "temperature_2m_max");
  const tMinCols = memberColumns(res, "temperature_2m_min");
  const precipCols = memberColumns(res, "precipitation_sum");
  if (!tMaxCols.length || !tMinCols.length || !precipCols.length) {
    throw new WeatherUnavailableError("seasonal", null, "missing variables");
  }

  const weeks = OUTLOOK_WEEKS.map((week) => {
    const { from, to } = weekRange(today, week);
    const temps: number[] = [];
    const precips: number[] = [];
    for (let i = 0; i < time.length; i++) {
      if (time[i] < from || time[i] > to) continue;
      const tMax = ensembleMean(tMaxCols, i);
      const tMin = ensembleMean(tMinCols, i);
      const p = ensembleMean(precipCols, i);
      if (tMax === null || tMin === null || p === null) continue;
      temps.push((tMax + tMin) / 2);
      precips.push(p);
    }
    if (!temps.length) {
      throw new WeatherUnavailableError(
        "seasonal",
        null,
        `no data for week ${week} (${from})`,
      );
    }
    const weekTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const weekPrecip =
      (precips.reduce((a, b) => a + b, 0) / precips.length) * 7;
    const normal = normalForWeek(normals, from);
    const tempAnomaly = round1(weekTemp - normal.tMean);
    const precipAnomaly = round1(weekPrecip - normal.weeklyPrecip);
    return {
      week,
      from,
      to,
      tempAnomaly,
      precipAnomaly,
      label: labelFor(tempAnomaly, precipAnomaly, normal.weeklyPrecip),
      confidence: "low" as const,
    };
  });

  return { dataset: OUTLOOK_DATASET, issuedAt: issuedAt.toISOString(), weeks };
}
