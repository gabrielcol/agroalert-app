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

type ShortRange = { forecast: Forecast; currentSeason: CurrentSeason };

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

export async function getWeatherBrief(
  fieldProfileId: string,
  deps: WeatherBriefDeps,
): Promise<WeatherBrief> {
  const now = deps.now ?? (() => new Date());
  const client = deps.client ?? createOpenMeteoClient();
  const at = now();
  const today = todayIn(at);

  const profile = await deps.db.fieldProfile.findUnique({
    where: { id: fieldProfileId },
    select: { lat: true, lng: true },
  });
  if (!profile) throw new FieldProfileNotFoundError(fieldProfileId);
  const point = { lat: profile.lat, lng: profile.lng };
  const cell = weatherCellFor(point);
  const cached = await deps.db.weatherCell.findUnique({
    where: { latCell_lngCell: cell },
  });

  // Climate Profile (long TTL). Must exist before the short-range pieces,
  // which are anomalies against its normals.
  let climateProfile = fresh(cached?.climateFetchedAt, CLIMATE_TTL_MS, at)
    ? parseCached(cached?.climateProfile, (v) => {
        const r = climateProfileSchema.safeParse(v);
        return r.success ? r.data : null;
      })
    : null;
  const span = climateSpan(today);
  if (climateProfile && climateProfile.span.toYear !== span.toYear) {
    climateProfile = null; // a new calendar year moved the ten-year window
  }
  let climateFetchedAt = cached?.climateFetchedAt ?? null;
  if (!climateProfile) {
    const res = await client.archive(
      point,
      `${span.fromYear}-01-01`,
      `${span.toYear}-12-31`,
    );
    climateProfile = buildClimateProfile(archiveRows(res), span);
    climateFetchedAt = at;
  }

  // Forecast + Current Season (short TTL, keyed to today).
  let shortRange = fresh(cached?.forecastFetchedAt, SHORT_TTL_MS, at)
    ? parseCached(cached?.forecast, (v): ShortRange | null => {
        const o = v as Partial<ShortRange>;
        const f = forecastSchema.safeParse(o?.forecast);
        const c = currentSeasonSchema.safeParse(o?.currentSeason);
        return f.success && c.success && f.data.days[0]?.date === today
          ? { forecast: f.data, currentSeason: c.data }
          : null;
      })
    : null;
  let forecastFetchedAt = cached?.forecastFetchedAt ?? null;
  if (!shortRange) {
    const range = currentSeasonRange(today);
    const [ytd, forecastRes] = await Promise.all([
      client.archive(point, range.start, range.end),
      client.forecast(point),
    ]);
    shortRange = {
      forecast: buildForecast(forecastRes, today, at),
      currentSeason: buildCurrentSeason(
        archiveRows(ytd),
        climateProfile.monthlyNormals,
        yearOf(today),
      ),
    };
    forecastFetchedAt = at;
  }

  // Seasonal Outlook (short TTL).
  let outlook: SeasonalOutlook | null = fresh(
    cached?.outlookFetchedAt,
    SHORT_TTL_MS,
    at,
  )
    ? parseCached(cached?.outlook, (v) => {
        const r = seasonalOutlookSchema.safeParse(v);
        return r.success && r.data.weeks[0]?.from === weekFrom(today, 3)
          ? r.data
          : null;
      })
    : null;
  let outlookFetchedAt = cached?.outlookFetchedAt ?? null;
  if (!outlook) {
    const res = await client.seasonal(point);
    outlook = buildSeasonalOutlook(
      res,
      climateProfile.monthlyNormals,
      today,
      at,
    );
    outlookFetchedAt = at;
  }

  const brief: WeatherBrief = weatherBriefSchema.parse({
    today,
    timezone: TIMEZONE,
    units: UNITS,
    location: point,
    climateProfile,
    currentSeason: shortRange.currentSeason,
    forecast: shortRange.forecast,
    seasonalOutlook: outlook,
  });

  const changed =
    climateFetchedAt !== cached?.climateFetchedAt ||
    forecastFetchedAt !== cached?.forecastFetchedAt ||
    outlookFetchedAt !== cached?.outlookFetchedAt;
  if (changed) {
    const data = {
      climateProfile: climateProfile as ClimateProfile,
      climateFetchedAt,
      forecast: shortRange,
      forecastFetchedAt,
      outlook,
      outlookFetchedAt,
      sourceDataset: `${climateProfile.dataset}; ${outlook.dataset}`,
      sourceSpan: `${span.fromYear}-01-01..${span.toYear}-12-31`,
    };
    await deps.db.weatherCell.upsert({
      where: { latCell_lngCell: cell },
      create: { ...cell, ...data },
      update: data,
    });
  }

  return brief;
}

function weekFrom(today: string, week: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7);
  return d.toISOString().slice(0, 10);
}

export { WeatherUnavailableError };
