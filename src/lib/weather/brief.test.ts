// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import archive from "./__fixtures__/archive-2016-2025.json";
import ytd from "./__fixtures__/archive-2026-ytd.json";
import forecast from "./__fixtures__/forecast.json";
import seasonal from "./__fixtures__/seasonal.json";
import {
  CLIMATE_TTL_MS,
  FieldProfileNotFoundError,
  getWeatherBrief,
  refreshClimateProfile,
  refreshForecast,
  SHORT_TTL_MS,
  type WeatherDb,
} from "./brief";
import {
  WeatherUnavailableError,
  type ArchiveResponse,
  type OpenMeteoClient,
} from "./open-meteo";
import { weatherBriefSchema } from "./schema";

const NOW = new Date("2026-09-12T08:00:00Z"); // 11:00 in Bucharest
const now = () => NOW;

/** Shift every date/time column of a recorded response by N days. */
function shifted<
  T extends { daily: { time: string[] }; hourly?: { time: string[] } },
>(res: T, days: number): T {
  const shift = (t: string) => {
    const d = new Date(`${t.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10) + t.slice(10);
  };
  return {
    ...res,
    daily: { ...res.daily, time: res.daily.time.map(shift) },
    ...(res.hourly
      ? { hourly: { ...res.hourly, time: res.hourly.time.map(shift) } }
      : {}),
  };
}

function fakeClient(
  overrides: Partial<OpenMeteoClient> = {},
  shiftDays = 0,
): OpenMeteoClient {
  return {
    archive: vi.fn(
      async (_p, start: string) =>
        (start.startsWith("2026") ? ytd : archive) as ArchiveResponse,
    ),
    forecast: vi.fn(async () => shifted(forecast as never, shiftDays) as never),
    seasonal: vi.fn(async () => shifted(seasonal as never, shiftDays) as never),
    ...overrides,
  };
}

type CellRow = Record<string, unknown> | null;

function fakeDb(
  profile: { lat: number; lng: number } | null,
  cell: CellRow = null,
) {
  const db = {
    fieldProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
    weatherCell: {
      findUnique: vi.fn().mockResolvedValue(cell),
      upsert: vi.fn().mockImplementation(async ({ create }) => create),
    },
  };
  return { db, asDb: db as unknown as WeatherDb };
}

const profile = { lat: 44.63, lng: 27.14 };

async function primedCell() {
  const { db, asDb } = fakeDb(profile);
  await getWeatherBrief("fp1", { db: asDb, client: fakeClient(), now });
  return db.weatherCell.upsert.mock.calls[0][0].create as Record<
    string,
    unknown
  >;
}

describe("getWeatherBrief", () => {
  it("throws FieldProfileNotFoundError for an unknown profile without fetching", async () => {
    const client = fakeClient();
    const { asDb } = fakeDb(null);
    await expect(
      getWeatherBrief("ghost", { db: asDb, client, now }),
    ).rejects.toBeInstanceOf(FieldProfileNotFoundError);
    expect(client.archive).not.toHaveBeenCalled();
  });

  it("on a cache miss fetches all four pieces, stores aggregates only, and returns a valid brief", async () => {
    const client = fakeClient();
    const { db, asDb } = fakeDb(profile);
    const brief = await getWeatherBrief("fp1", { db: asDb, client, now });

    expect(weatherBriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.today).toBe("2026-09-12");
    expect(brief.location).toEqual(profile);
    expect(brief.climateProfile.span).toEqual({ fromYear: 2016, toYear: 2025 });
    expect(brief.currentSeason.throughDate).toBe("2026-09-07");
    expect(brief.forecast.days[0].date).toBe("2026-09-12");
    expect(brief.seasonalOutlook.weeks[0].from).toBe("2026-09-26");

    expect(client.archive).toHaveBeenCalledTimes(2);
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2016-01-01",
      "2025-12-31",
    );
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2026-01-01",
      "2026-09-07",
    );
    expect(client.forecast).toHaveBeenCalledTimes(1);
    expect(client.seasonal).toHaveBeenCalledTimes(1);

    expect(db.weatherCell.findUnique).toHaveBeenCalledWith({
      where: { latCell_lngCell: { latCell: 44.6, lngCell: 27.1 } },
    });
    const upsert = db.weatherCell.upsert.mock.calls[0][0];
    expect(upsert.where).toEqual({
      latCell_lngCell: { latCell: 44.6, lngCell: 27.1 },
    });
    expect(upsert.create).toMatchObject({
      latCell: 44.6,
      lngCell: 27.1,
      climateFetchedAt: NOW,
      forecastFetchedAt: NOW,
      outlookFetchedAt: NOW,
      sourceDataset: "ERA5-Land/ERA5; EC46",
      sourceSpan: "2016-01-01..2025-12-31",
    });
    // aggregates only: no raw daily series anywhere in the stored JSON
    expect(JSON.stringify(upsert.create)).not.toContain("temperature_2m_max");
    expect(upsert.create.forecast).toHaveProperty("currentSeason");
  });

  it("serves a fresh cell without calling Open-Meteo or writing", async () => {
    const cell = await primedCell();
    const client = fakeClient();
    const { db, asDb } = fakeDb({ lat: 44.58, lng: 27.06 }, cell);
    const brief = await getWeatherBrief("fp2", {
      db: asDb,
      client,
      now: () => new Date(NOW.getTime() + SHORT_TTL_MS - 60_000),
    });
    expect(weatherBriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.location).toEqual({ lat: 44.58, lng: 27.06 });
    expect(client.archive).not.toHaveBeenCalled();
    expect(client.forecast).not.toHaveBeenCalled();
    expect(client.seasonal).not.toHaveBeenCalled();
    expect(db.weatherCell.upsert).not.toHaveBeenCalled();
  });

  it("refreshes only the short-range pieces after six hours", async () => {
    const cell = await primedCell();
    const client = fakeClient();
    const { db, asDb } = fakeDb(profile, cell);
    const later = new Date(NOW.getTime() + SHORT_TTL_MS + 60_000);
    await getWeatherBrief("fp1", { db: asDb, client, now: () => later });
    expect(client.archive).toHaveBeenCalledTimes(1);
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2026-01-01",
      "2026-09-07",
    );
    expect(client.forecast).toHaveBeenCalledTimes(1);
    expect(client.seasonal).toHaveBeenCalledTimes(1);
    const update = db.weatherCell.upsert.mock.calls[0][0].update;
    expect(update.climateFetchedAt).toEqual(NOW);
    expect(update.forecastFetchedAt).toEqual(later);
    expect(update.outlookFetchedAt).toEqual(later);
  });

  it("refreshes the Climate Profile after thirty days", async () => {
    const cell = await primedCell();
    const client = fakeClient({}, 31);
    const { asDb } = fakeDb(profile, cell);
    const later = new Date(
      NOW.getTime() + CLIMATE_TTL_MS + 24 * 60 * 60 * 1000,
    );
    await getWeatherBrief("fp1", { db: asDb, client, now: () => later });
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2016-01-01",
      "2025-12-31",
    );
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2026-01-01",
      "2026-10-08",
    );
  });

  it("ignores a cached forecast keyed to a different day even inside the TTL", async () => {
    const cell = await primedCell();
    const client = fakeClient({
      forecast: vi.fn(async () => {
        throw new WeatherUnavailableError("forecast", 503, "HTTP 503");
      }),
    });
    const { asDb } = fakeDb(profile, {
      ...cell,
      forecastFetchedAt: new Date("2026-09-13T00:30:00Z"),
      outlookFetchedAt: new Date("2026-09-13T00:30:00Z"),
      climateFetchedAt: new Date("2026-09-13T00:30:00Z"),
    });
    // 03:40 Bucharest on the 13th: yesterday's forecast is 3h old but stale by date.
    await expect(
      getWeatherBrief("fp1", {
        db: asDb,
        client,
        now: () => new Date("2026-09-13T00:40:00Z"),
      }),
    ).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(client.forecast).toHaveBeenCalled();
  });

  it("propagates an Open-Meteo failure and writes nothing", async () => {
    const client = fakeClient({
      seasonal: vi.fn(async () => {
        throw new WeatherUnavailableError("seasonal", 429, "rate limited");
      }),
    });
    const { db, asDb } = fakeDb(profile);
    await expect(
      getWeatherBrief("fp1", { db: asDb, client, now }),
    ).rejects.toMatchObject({
      name: "WeatherUnavailableError",
      status: 429,
    });
    expect(db.weatherCell.upsert).not.toHaveBeenCalled();
  });

  it("treats an unparseable cached aggregate as a miss", async () => {
    const cell = await primedCell();
    const client = fakeClient();
    const { asDb } = fakeDb(profile, { ...cell, outlook: { garbage: true } });
    await getWeatherBrief("fp1", { db: asDb, client, now });
    expect(client.seasonal).toHaveBeenCalledTimes(1);
    expect(client.forecast).not.toHaveBeenCalled();
  });
});

// The loading screen drives one step per cache slice (issue 0011): each
// entry point must touch its own slice and leave the others alone.
describe("per-phase refresh", () => {
  it("refreshClimateProfile pulls the archive only and writes the climate slice", async () => {
    const client = fakeClient();
    const { db, asDb } = fakeDb(profile);
    const status = await refreshClimateProfile("fp1", {
      db: asDb,
      client,
      now,
    });

    expect(status).toEqual({ cellId: "44.6,27.1", refreshed: true });
    expect(client.archive).toHaveBeenCalledTimes(1);
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2016-01-01",
      "2025-12-31",
    );
    expect(client.forecast).not.toHaveBeenCalled();
    expect(client.seasonal).not.toHaveBeenCalled();

    const create = db.weatherCell.upsert.mock.calls[0][0].create;
    expect(create.climateFetchedAt).toEqual(NOW);
    expect(create.forecast).toBeUndefined();
    expect(create.forecastFetchedAt).toBeUndefined();
    expect(create.outlook).toBeUndefined();
    expect(create.outlookFetchedAt).toBeUndefined();
  });

  it("refreshForecast reuses a warm Climate Profile and fills the short-range slices", async () => {
    const primer = fakeDb(profile);
    await refreshClimateProfile("fp1", {
      db: primer.asDb,
      client: fakeClient(),
      now,
    });
    const cell = primer.db.weatherCell.upsert.mock.calls[0][0].create;

    const client = fakeClient();
    const { db, asDb } = fakeDb(profile, cell);
    const status = await refreshForecast("fp1", { db: asDb, client, now });

    expect(status).toEqual({ cellId: "44.6,27.1", refreshed: true });
    // the ten-year pull is NOT repeated; only the year-to-date archive is
    expect(client.archive).toHaveBeenCalledTimes(1);
    expect(client.archive).toHaveBeenCalledWith(
      profile,
      "2026-01-01",
      "2026-09-07",
    );
    expect(client.forecast).toHaveBeenCalledTimes(1);
    expect(client.seasonal).toHaveBeenCalledTimes(1);

    const update = db.weatherCell.upsert.mock.calls[0][0].update;
    expect(update.climateFetchedAt).toEqual(NOW);
    expect(update.forecastFetchedAt).toEqual(NOW);
    expect(update.outlookFetchedAt).toEqual(NOW);
  });

  it("reports refreshed: false and writes nothing when the cell is already warm", async () => {
    const cell = await primedCell();
    const client = fakeClient();
    const { db, asDb } = fakeDb(profile, cell);

    expect(
      await refreshClimateProfile("fp1", { db: asDb, client, now }),
    ).toEqual({ cellId: "44.6,27.1", refreshed: false });
    expect(await refreshForecast("fp1", { db: asDb, client, now })).toEqual({
      cellId: "44.6,27.1",
      refreshed: false,
    });
    expect(client.archive).not.toHaveBeenCalled();
    expect(client.forecast).not.toHaveBeenCalled();
    expect(client.seasonal).not.toHaveBeenCalled();
    expect(db.weatherCell.upsert).not.toHaveBeenCalled();
  });

  it("propagates an Open-Meteo failure from a phase without writing", async () => {
    const client = fakeClient({
      archive: vi.fn(async () => {
        throw new WeatherUnavailableError("archive", 503, "HTTP 503");
      }),
    });
    const { db, asDb } = fakeDb(profile);
    await expect(
      refreshClimateProfile("fp1", { db: asDb, client, now }),
    ).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(db.weatherCell.upsert).not.toHaveBeenCalled();
  });
});
