import { addDays, dayOfYear, daysInMonth, monthOf, yearOf } from "./dates";
import type { ArchiveResponse } from "./open-meteo";
import { WeatherUnavailableError } from "./open-meteo";
import type {
  ClimateProfile,
  ClimateYear,
  CurrentSeason,
  FrostHeatYear,
  MonthlyNormal,
} from "./schema";

/**
 * Pure aggregation of Open-Meteo archive rows into the Climate Profile and
 * the Current Season (CONTEXT.md). No I/O; unit-tested on recorded fixtures.
 */

export type DailyRow = {
  date: string;
  year: number;
  month: number;
  tMax: number;
  tMin: number;
  tMean: number;
  precip: number;
  et0: number;
};

export const CLIMATE_DATASET = "ERA5-Land/ERA5";
const FROST_C = 0;
const HEAT_30 = 30;
const HEAT_35 = 35;
const DRIEST_WINDOW_DAYS = 60;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const spread = (xs: number[]) =>
  xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
const stddev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/**
 * Turn an archive response into rows. Trailing days the archive has not
 * produced yet (ERA5 runs ~5 days behind) come back as nulls and are dropped;
 * a null inside the series is a data gap and is dropped too. `tMean` falls
 * back to (max+min)/2 when the API omits it.
 */
export function archiveRows(res: ArchiveResponse): DailyRow[] {
  const d = res.daily;
  const rows: DailyRow[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const tMax = d.temperature_2m_max?.[i] ?? null;
    const tMin = d.temperature_2m_min?.[i] ?? null;
    const precip = d.precipitation_sum?.[i] ?? null;
    const et0 = d.et0_fao_evapotranspiration?.[i] ?? null;
    if (tMax === null || tMin === null || precip === null || et0 === null) {
      continue;
    }
    const tMean = d.temperature_2m_mean?.[i] ?? (tMax + tMin) / 2;
    const date = d.time[i];
    rows.push({
      date,
      year: yearOf(date),
      month: monthOf(date),
      tMax,
      tMin,
      tMean,
      precip,
      et0,
    });
  }
  return rows;
}

function gddDay(row: DailyRow, base: number): number {
  return Math.max(0, (row.tMax + row.tMin) / 2 - base);
}

export function monthlyNormals(
  rows: DailyRow[],
  years: number[],
): MonthlyNormal[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const inMonth = rows.filter((r) => r.month === month);
    const perYearPrecip = years.map((y) =>
      sum(inMonth.filter((r) => r.year === y).map((r) => r.precip)),
    );
    const perYearEt0 = years.map((y) =>
      sum(inMonth.filter((r) => r.year === y).map((r) => r.et0)),
    );
    const precipSum = round1(mean(perYearPrecip));
    const et0 = round1(mean(perYearEt0));
    return {
      month,
      tMean: round1(mean(inMonth.map((r) => r.tMean))),
      tMin: round1(mean(inMonth.map((r) => r.tMin))),
      tMax: round1(mean(inMonth.map((r) => r.tMax))),
      precipSum,
      et0,
      waterBalance: round1(precipSum - et0),
    };
  });
}

export function frostHeatYear(rows: DailyRow[], year: number): FrostHeatYear {
  const inYear = rows.filter((r) => r.year === year);
  const spring = inYear.filter((r) => r.month <= 6 && r.tMin <= FROST_C);
  const autumn = inYear.filter((r) => r.month >= 7 && r.tMin <= FROST_C);
  return {
    year,
    lastSpringFrost: spring.length ? spring[spring.length - 1].date : null,
    firstAutumnFrost: autumn.length ? autumn[0].date : null,
    frostDays: inYear.filter((r) => r.tMin <= FROST_C).length,
    daysOver30: inYear.filter((r) => r.tMax > HEAT_30).length,
    daysOver35: inYear.filter((r) => r.tMax > HEAT_35).length,
  };
}

function statSpread(xs: number[]) {
  return { mean: round1(mean(xs)), spread: round1(spread(xs)) };
}

export function frostHeatSummary(perYear: FrostHeatYear[]) {
  const springDoy = perYear
    .map((y) => y.lastSpringFrost)
    .filter((d): d is string => d !== null)
    .map(dayOfYear);
  const autumnDoy = perYear
    .map((y) => y.firstAutumnFrost)
    .filter((d): d is string => d !== null)
    .map(dayOfYear);
  return {
    lastSpringFrostDoy: springDoy.length ? statSpread(springDoy) : null,
    firstAutumnFrostDoy: autumnDoy.length ? statSpread(autumnDoy) : null,
    frostDays: statSpread(perYear.map((y) => y.frostDays)),
    daysOver30: statSpread(perYear.map((y) => y.daysOver30)),
    daysOver35: statSpread(perYear.map((y) => y.daysOver35)),
  };
}

export function gddByMonth(rows: DailyRow[], years: number[]) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const perYear = (base: number) =>
      years.map((y) =>
        sum(
          rows
            .filter((r) => r.year === y && r.month === month)
            .map((r) => gddDay(r, base)),
        ),
      );
    return {
      month,
      base5: round1(mean(perYear(5))),
      base10: round1(mean(perYear(10))),
    };
  });
}

/** Driest contiguous 60-day window of a year's rows (rows are date-sorted). */
export function driestWindow(
  inYear: DailyRow[],
): ClimateYear["driest60DayWindow"] {
  const n = Math.min(DRIEST_WINDOW_DAYS, inYear.length);
  let best = { start: 0, precipSum: Number.POSITIVE_INFINITY };
  let window = sum(inYear.slice(0, n).map((r) => r.precip));
  best = { start: 0, precipSum: window };
  for (let i = n; i < inYear.length; i++) {
    window += inYear[i].precip - inYear[i - n].precip;
    if (window < best.precipSum - 1e-9)
      best = { start: i - n + 1, precipSum: window };
  }
  return {
    from: inYear[best.start].date,
    to: inYear[best.start + n - 1].date,
    precipSum: round1(Math.max(0, best.precipSum)),
  };
}

export function climateYears(rows: DailyRow[], years: number[]): ClimateYear[] {
  const partial = years.map((year) => {
    const inYear = rows.filter((r) => r.year === year);
    return {
      year,
      annualPrecip: round1(sum(inYear.map((r) => r.precip))),
      summerPrecip: round1(
        sum(
          inYear
            .filter((r) => r.month >= 6 && r.month <= 8)
            .map((r) => r.precip),
        ),
      ),
      driest60DayWindow: driestWindow(inYear),
    };
  });
  const annual = partial.map((y) => y.annualPrecip);
  const threshold = mean(annual) - stddev(annual);
  return partial.map((y) => ({
    ...y,
    droughtFlag: y.annualPrecip < threshold,
  }));
}

export function buildClimateProfile(
  rows: DailyRow[],
  span: { fromYear: number; toYear: number },
): ClimateProfile {
  const years = Array.from(
    { length: span.toYear - span.fromYear + 1 },
    (_, i) => span.fromYear + i,
  );
  const missing = years.filter((y) => !rows.some((r) => r.year === y));
  if (missing.length) {
    throw new WeatherUnavailableError(
      "archive",
      null,
      `no data for year(s) ${missing.join(", ")}`,
    );
  }
  const perYear = years.map((y) => frostHeatYear(rows, y));
  return {
    dataset: CLIMATE_DATASET,
    span,
    monthlyNormals: monthlyNormals(rows, years),
    frostHeat: { perYear, summary: frostHeatSummary(perYear) },
    gdd: gddByMonth(rows, years),
    years: climateYears(rows, years),
  };
}

/**
 * Current Season: the current year to date against the Climate Profile
 * normals. The running month's precipitation normal is scaled to the days
 * observed so a half-month never looks like a drought.
 */
export function buildCurrentSeason(
  rows: DailyRow[],
  normals: MonthlyNormal[],
  year: number,
): CurrentSeason {
  const inYear = rows.filter((r) => r.year === year);
  if (!inYear.length) {
    throw new WeatherUnavailableError("archive", null, `no data for ${year}`);
  }
  const throughDate = inYear[inYear.length - 1].date;
  const months = [...new Set(inYear.map((r) => r.month))].sort((a, b) => a - b);
  return {
    year,
    throughDate,
    monthly: months.map((month) => {
      const inMonth = inYear.filter((r) => r.month === month);
      const normal = normals[month - 1];
      const tMean = round1(mean(inMonth.map((r) => r.tMean)));
      const precipSum = round1(sum(inMonth.map((r) => r.precip)));
      const et0 = round1(sum(inMonth.map((r) => r.et0)));
      const coverage = inMonth.length / daysInMonth(year, month);
      return {
        month,
        tMean,
        precipSum,
        et0,
        waterBalance: round1(precipSum - et0),
        anomaly: {
          tMean: round1(tMean - normal.tMean),
          precipSum: round1(precipSum - normal.precipSum * coverage),
        },
      };
    }),
    last30Days: inYear.slice(-30).map((r) => ({
      date: r.date,
      tMax: r.tMax,
      tMin: r.tMin,
      precipSum: r.precip,
      et0: round2(r.et0),
    })),
  };
}

/** The archive window for the Climate Profile: ten full calendar years. */
export function climateSpan(today: string): {
  fromYear: number;
  toYear: number;
} {
  const toYear = yearOf(today) - 1;
  return { fromYear: toYear - 9, toYear };
}

/** Year-to-date window, ending before the archive's ~5-day latency. */
export const ARCHIVE_LATENCY_DAYS = 5;
export function currentSeasonRange(today: string): {
  start: string;
  end: string;
} {
  return {
    start: `${yearOf(today)}-01-01`,
    end: addDays(today, -ARCHIVE_LATENCY_DAYS),
  };
}
