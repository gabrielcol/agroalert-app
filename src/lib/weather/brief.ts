import type { PrismaClient } from "@/generated/prisma/client";
import { weatherCellFor } from "@/lib/agro/field-profile";

import {
  archiveRows,
  buildClimateProfile,
  buildCurrentSeason,
  climateSpan,
  currentSeasonRange,
} from "./climate";
import { todayIn, yearOf } from "./dates";
import { buildForecast } from "./forecast";
import {
  createOpenMeteoClient,
  WeatherUnavailableError,
  type OpenMeteoClient,
} from "./open-meteo";
import { buildSeasonalOutlook } from "./outlook";
import {
  climateProfileSchema,
  currentSeasonSchema,
  forecastSchema,
  seasonalOutlookSchema,
  TIMEZONE,
  UNITS,
  weatherBriefSchema,
  type ClimateProfile,
  type CurrentSeason,
  type Forecast,
  type MonthlyNormal,
  type SeasonalOutlook,
  type WeatherBrief,
} from "./schema";

/**
 * Build the Weather Brief for a Field Profile, serving aggregates from the
 * `WeatherCell` cache (one row per 0.1° cell) and refreshing them from
 * Open-Meteo when stale. Only aggregates are stored, never raw series.
 *
 * - Climate Profile: refreshed after 30 days.
 * - Forecast + Current Season (stored together in the `forecast` column,
 *   both keyed to "today"): refreshed after 6 hours.
 * - Seasonal Outlook: refreshed after 6 hours.
 *
 * Any Open-Meteo failure propagates as `WeatherUnavailableError`; nothing
 * partial is written or returned (ADR 0003).
 *
 * The work is split into one `ensure*` function per cache slice so the
 * wizard's loading screen can drive a step from each phase
 * (`refreshClimateProfile` / `refreshForecast`, behind `weather.climate` and
 * `weather.forecast`). `getWeatherBrief` is composed from the same functions
 * and keeps writing the cell exactly once, at the end — a failed piece still
 * leaves the row untouched.
 */

export const CLIMATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SHORT_TTL_MS = 6 * 60 * 60 * 1000;

export class FieldProfileNotFoundError extends Error {
  constructor(id: string) {
    super(`Field Profile ${id} not found`);
    this.name = "FieldProfileNotFoundError";
  }
}

export type WeatherDb = Pick<PrismaClient, "fieldProfile" | "weatherCell">;

export type WeatherBriefDeps = {
  db: WeatherDb;
  client?: OpenMeteoClient;
  now?: () => Date;
};

export type ShortRange = { forecast: Forecast; currentSeason: CurrentSeason };

type Point = { lat: number; lng: number };
type CellKey = { latCell: number; lngCell: number };

/** Only the columns the phases read; keeps the fakes in tests small. */
type CachedCell = {
  climateProfile?: unknown;
  climateFetchedAt?: Date | null;
  forecast?: unknown;
  forecastFetchedAt?: Date | null;
  outlook?: unknown;
  outlookFetchedAt?: Date | null;
} | null;

/** Everything a phase needs besides the cache: the clock and the client. */
export type PhaseContext = {
  /** Wall clock for TTLs and "built at" stamps. */
  at: Date;
  /** `at` as an ISO day in the product timezone. */
  today: string;
  client: OpenMeteoClient;
};

/** One resolved cache slice: its value, its stamp, and whether it was refetched. */
export type Phase<T> = { value: T; fetchedAt: Date; refreshed: boolean };

function fresh(fetchedAt: Date | null | undefined, ttlMs: number, now: Date) {
  return !!fetchedAt && now.getTime() - fetchedAt.getTime() < ttlMs;
}

function parseCached<T>(
  value: unknown,
  parse: (v: unknown) => T | null,
): T | null {
  if (value === null || value === undefined) return null;
  return parse(value);
}

export function phaseContext(deps: WeatherBriefDeps): PhaseContext {
  const at = (deps.now ?? (() => new Date()))();
  return {
    at,
    today: todayIn(at),
    client: deps.client ?? createOpenMeteoClient(),
  };
}

/** The Field Profile's point and the cached row of the cell it falls in. */
async function loadCell(fieldProfileId: string, deps: WeatherBriefDeps) {
  const profile = await deps.db.fieldProfile.findUnique({
    where: { id: fieldProfileId },
    select: { lat: true, lng: true },
  });
  if (!profile) throw new FieldProfileNotFoundError(fieldProfileId);
  const point: Point = { lat: profile.lat, lng: profile.lng };
  const cell = weatherCellFor(point);
  const cached = (await deps.db.weatherCell.findUnique({
    where: { latCell_lngCell: cell },
  })) as CachedCell;
  return { point, cell, cached };
}

/** Stable id of a 0.1° cell, e.g. `44.6,27.1`. */
export function cellId(cell: CellKey): string {
  return `${cell.latCell},${cell.lngCell}`;
}

/**
 * Climate Profile slice (long TTL). Must be resolved before the short-range
 * pieces, which are anomalies against its normals. A new calendar year moves
 * the ten-year window, which invalidates a cached profile regardless of TTL.
 */
export async function ensureClimateProfile(
  point: Point,
  cached: CachedCell,
  ctx: PhaseContext,
): Promise<Phase<ClimateProfile>> {
  let climateProfile = fresh(cached?.climateFetchedAt, CLIMATE_TTL_MS, ctx.at)
    ? parseCached(cached?.climateProfile, (v) => {
        const r = climateProfileSchema.safeParse(v);
        return r.success ? r.data : null;
      })
    : null;
  const span = climateSpan(ctx.today);
  if (climateProfile && climateProfile.span.toYear !== span.toYear) {
    climateProfile = null; // a new calendar year moved the ten-year window
  }
  if (climateProfile) {
    return {
      value: climateProfile,
      fetchedAt: cached?.climateFetchedAt as Date,
      refreshed: false,
    };
  }
  const res = await ctx.client.archive(
    point,
    `${span.fromYear}-01-01`,
    `${span.toYear}-12-31`,
  );
  return {
    value: buildClimateProfile(archiveRows(res), span),
    fetchedAt: ctx.at,
    refreshed: true,
  };
}

/**
 * Forecast + Current Season slice (short TTL, stored together in the
 * `forecast` column and keyed to today: a cached pair built yesterday is a
 * miss even inside the TTL).
 */
export async function ensureShortRange(
  point: Point,
  cached: CachedCell,
  ctx: PhaseContext,
  normals: MonthlyNormal[],
): Promise<Phase<ShortRange>> {
  const shortRange = fresh(cached?.forecastFetchedAt, SHORT_TTL_MS, ctx.at)
    ? parseCached(cached?.forecast, (v): ShortRange | null => {
        const o = v as Partial<ShortRange>;
        const f = forecastSchema.safeParse(o?.forecast);
        const c = currentSeasonSchema.safeParse(o?.currentSeason);
        return f.success && c.success && f.data.days[0]?.date === ctx.today
          ? { forecast: f.data, currentSeason: c.data }
          : null;
      })
    : null;
  if (shortRange) {
    return {
      value: shortRange,
      fetchedAt: cached?.forecastFetchedAt as Date,
      refreshed: false,
    };
  }
  const range = currentSeasonRange(ctx.today);
  const [ytd, forecastRes] = await Promise.all([
    ctx.client.archive(point, range.start, range.end),
    ctx.client.forecast(point),
  ]);
  return {
    value: {
      forecast: buildForecast(forecastRes, ctx.today, ctx.at),
      currentSeason: buildCurrentSeason(
        archiveRows(ytd),
        normals,
        yearOf(ctx.today),
      ),
    },
    fetchedAt: ctx.at,
    refreshed: true,
  };
}

/** Seasonal Outlook slice (short TTL, keyed to the week it starts on). */
export async function ensureOutlook(
  point: Point,
  cached: CachedCell,
  ctx: PhaseContext,
  normals: MonthlyNormal[],
): Promise<Phase<SeasonalOutlook>> {
  const outlook: SeasonalOutlook | null = fresh(
    cached?.outlookFetchedAt,
    SHORT_TTL_MS,
    ctx.at,
  )
    ? parseCached(cached?.outlook, (v) => {
        const r = seasonalOutlookSchema.safeParse(v);
        return r.success && r.data.weeks[0]?.from === weekFrom(ctx.today, 3)
          ? r.data
          : null;
      })
    : null;
  if (outlook) {
    return {
      value: outlook,
      fetchedAt: cached?.outlookFetchedAt as Date,
      refreshed: false,
    };
  }
  const res = await ctx.client.seasonal(point);
  return {
    value: buildSeasonalOutlook(res, normals, ctx.today, ctx.at),
    fetchedAt: ctx.at,
    refreshed: true,
  };
}

type CellSlices = {
  climate?: Phase<ClimateProfile>;
  short?: Phase<ShortRange>;
  outlook?: Phase<SeasonalOutlook>;
};

/** The columns a write owns: only the slices it was given. */
function cellData(slices: CellSlices, today: string) {
  const span = climateSpan(today);
  const datasets = [
    slices.climate?.value.dataset,
    slices.outlook?.value.dataset,
  ]
    .filter(Boolean)
    .join("; ");
  return {
    ...(slices.climate && {
      climateProfile: slices.climate.value as ClimateProfile,
      climateFetchedAt: slices.climate.fetchedAt,
    }),
    ...(slices.short && {
      forecast: slices.short.value,
      forecastFetchedAt: slices.short.fetchedAt,
    }),
    ...(slices.outlook && {
      outlook: slices.outlook.value,
      outlookFetchedAt: slices.outlook.fetchedAt,
    }),
    ...(datasets && { sourceDataset: datasets }),
    ...(slices.climate && {
      sourceSpan: `${span.fromYear}-01-01..${span.toYear}-12-31`,
    }),
  };
}

async function writeCell(
  deps: WeatherBriefDeps,
  cell: CellKey,
  slices: CellSlices,
  today: string,
) {
  const data = cellData(slices, today);
  await deps.db.weatherCell.upsert({
    where: { latCell_lngCell: cell },
    create: { ...cell, ...data },
    update: data,
  });
}

/** What the two cache-warming procedures answer with: small on purpose. */
export type WeatherCacheStatus = { cellId: string; refreshed: boolean };

/**
 * Freshen the Climate Profile slice of the cell a Field Profile falls in
 * (the ten-year archive pull) and report whether it was actually refetched.
 * Behind `weather.climate`; the wizard shows it as the "history" step.
 */
export async function refreshClimateProfile(
  fieldProfileId: string,
  deps: WeatherBriefDeps,
): Promise<WeatherCacheStatus> {
  const ctx = phaseContext(deps);
  const { point, cell, cached } = await loadCell(fieldProfileId, deps);
  const climate = await ensureClimateProfile(point, cached, ctx);
  if (climate.refreshed) {
    await writeCell(deps, cell, { climate }, ctx.today);
  }
  return { cellId: cellId(cell), refreshed: climate.refreshed };
}

/**
 * Freshen the short-range slices — Forecast, Current Season and Seasonal
 * Outlook — of the cell a Field Profile falls in. The Climate Profile is
 * resolved first because both are anomalies against its normals; after
 * `refreshClimateProfile` that is a cache hit and nothing is refetched.
 * Behind `weather.forecast`; the wizard shows it as the "forecast" step.
 */
export async function refreshForecast(
  fieldProfileId: string,
  deps: WeatherBriefDeps,
): Promise<WeatherCacheStatus> {
  const ctx = phaseContext(deps);
  const { point, cell, cached } = await loadCell(fieldProfileId, deps);
  const climate = await ensureClimateProfile(point, cached, ctx);
  const normals = climate.value.monthlyNormals;
  const short = await ensureShortRange(point, cached, ctx, normals);
  const outlook = await ensureOutlook(point, cached, ctx, normals);
  const refreshed = climate.refreshed || short.refreshed || outlook.refreshed;
  if (refreshed) {
    await writeCell(deps, cell, { climate, short, outlook }, ctx.today);
  }
  return {
    cellId: cellId(cell),
    refreshed: short.refreshed || outlook.refreshed,
  };
}

export async function getWeatherBrief(
  fieldProfileId: string,
  deps: WeatherBriefDeps,
): Promise<WeatherBrief> {
  const ctx = phaseContext(deps);
  const { point, cell, cached } = await loadCell(fieldProfileId, deps);

  const climate = await ensureClimateProfile(point, cached, ctx);
  const normals = climate.value.monthlyNormals;
  const short = await ensureShortRange(point, cached, ctx, normals);
  const outlook = await ensureOutlook(point, cached, ctx, normals);

  const brief: WeatherBrief = weatherBriefSchema.parse({
    today: ctx.today,
    timezone: TIMEZONE,
    units: UNITS,
    location: point,
    climateProfile: climate.value,
    currentSeason: short.value.currentSeason,
    forecast: short.value.forecast,
    seasonalOutlook: outlook.value,
  });

  // One write for the whole brief, only once every piece succeeded (ADR 0003).
  if (climate.refreshed || short.refreshed || outlook.refreshed) {
    await writeCell(deps, cell, { climate, short, outlook }, ctx.today);
  }

  return brief;
}

function weekFrom(today: string, week: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7);
  return d.toISOString().slice(0, 10);
}

export { WeatherUnavailableError };
