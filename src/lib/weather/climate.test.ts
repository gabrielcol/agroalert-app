import { describe, expect, it } from "vitest";

import archive from "./__fixtures__/archive-2016-2025.json";
import ytd from "./__fixtures__/archive-2026-ytd.json";
import {
  archiveRows,
  buildClimateProfile,
  buildCurrentSeason,
  climateSpan,
  currentSeasonRange,
  type DailyRow,
} from "./climate";
import type { ArchiveResponse } from "./open-meteo";
import { climateProfileSchema, currentSeasonSchema } from "./schema";

/** Three sparse years, small enough to check by hand. */
function synthetic(): ArchiveResponse {
  const days: [string, number, number, number, number][] = [
    // date, tMax, tMin, precip, et0
    ["2020-01-01", 2, -3, 1, 0.5],
    ["2020-01-02", 4, -1, 0, 0.5],
    ["2020-07-01", 32, 18, 10, 5],
    ["2020-07-02", 36, 20, 0, 6],
    ["2020-11-01", 8, -2, 3, 1],
    ["2021-01-01", 1, -4, 20, 0.4],
    ["2021-07-01", 29, 15, 40, 4],
    ["2021-12-15", -1, -6, 2, 0.2],
    ["2022-01-05", 5, 2, 30, 0.5],
    ["2022-07-03", 31, 17, 30, 5],
  ];
  return {
    daily: {
      time: days.map((d) => d[0]),
      temperature_2m_max: days.map((d) => d[1]),
      temperature_2m_min: days.map((d) => d[2]),
      // temperature_2m_mean deliberately absent: (max+min)/2 must be used
      precipitation_sum: days.map((d) => d[3]),
      et0_fao_evapotranspiration: days.map((d) => d[4]),
    },
  };
}

describe("archiveRows", () => {
  it("falls back to (max+min)/2 when temperature_2m_mean is absent", () => {
    const rows = archiveRows(synthetic());
    expect(rows[0]).toMatchObject({
      date: "2020-01-01",
      tMean: -0.5,
      year: 2020,
      month: 1,
    });
  });

  it("uses temperature_2m_mean when present and drops rows with nulls", () => {
    const rows = archiveRows({
      daily: {
        time: ["2026-09-01", "2026-09-02", "2026-09-03"],
        temperature_2m_max: [30, 31, null],
        temperature_2m_min: [15, 16, null],
        temperature_2m_mean: [22, 23.5, null],
        precipitation_sum: [0, 1, null],
        et0_fao_evapotranspiration: [4, 4, null],
      },
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-09-01", "2026-09-02"]);
    expect(rows[1].tMean).toBe(23.5);
  });
});

describe("buildClimateProfile on the synthetic series", () => {
  const profile = buildClimateProfile(archiveRows(synthetic()), {
    fromYear: 2020,
    toYear: 2022,
  });

  it("validates against the frozen contract", () => {
    expect(climateProfileSchema.safeParse(profile).success).toBe(true);
    expect(profile.dataset).toBe("ERA5-Land/ERA5");
    expect(profile.span).toEqual({ fromYear: 2020, toYear: 2022 });
  });

  it("computes January normals as means over days and over yearly sums", () => {
    expect(profile.monthlyNormals[0]).toEqual({
      month: 1,
      tMean: 0.8, // (-0.5 + 1.5 - 1.5 + 3.5) / 4
      tMin: -1.5,
      tMax: 3,
      precipSum: 17, // (1 + 20 + 30) / 3
      et0: 0.6, // (1.0 + 0.4 + 0.5) / 3
      waterBalance: 16.4,
    });
  });

  it("finds frost and heat days per year", () => {
    expect(profile.frostHeat.perYear).toEqual([
      {
        year: 2020,
        lastSpringFrost: "2020-01-02",
        firstAutumnFrost: "2020-11-01",
        frostDays: 3,
        daysOver30: 2,
        daysOver35: 1,
      },
      {
        year: 2021,
        lastSpringFrost: "2021-01-01",
        firstAutumnFrost: "2021-12-15",
        frostDays: 2,
        daysOver30: 0,
        daysOver35: 0,
      },
      {
        year: 2022,
        lastSpringFrost: null,
        firstAutumnFrost: null,
        frostDays: 0,
        daysOver30: 1,
        daysOver35: 0,
      },
    ]);
  });

  it("summarises frost dates as day-of-year mean and spread over years with frost", () => {
    expect(profile.frostHeat.summary).toEqual({
      lastSpringFrostDoy: { mean: 1.5, spread: 1 },
      firstAutumnFrostDoy: { mean: 327.5, spread: 43 }, // doy 306 (leap 2020) and 349
      frostDays: { mean: 1.7, spread: 3 },
      daysOver30: { mean: 1, spread: 2 },
      daysOver35: { mean: 0.3, spread: 1 },
    });
  });

  it("accumulates growing degree days per month at base 5 and 10", () => {
    expect(profile.gdd[6]).toEqual({ month: 7, base5: 26.3, base10: 19.7 });
    expect(profile.gdd[0]).toEqual({ month: 1, base5: 0, base10: 0 });
  });

  it("builds the per-year table and flags the drought year", () => {
    expect(
      profile.years.map((y) => [
        y.year,
        y.annualPrecip,
        y.summerPrecip,
        y.droughtFlag,
      ]),
    ).toEqual([
      [2020, 14, 10, true],
      [2021, 62, 40, false],
      [2022, 60, 30, false],
    ]);
    expect(profile.years[0].driest60DayWindow).toEqual({
      from: "2020-01-01",
      to: "2020-11-01",
      precipSum: 14,
    });
  });

  it("refuses a span with a missing year", () => {
    expect(() =>
      buildClimateProfile(archiveRows(synthetic()), {
        fromYear: 2019,
        toYear: 2022,
      }),
    ).toThrow(/2019/);
  });
});

describe("buildClimateProfile on the recorded 2016-2025 archive", () => {
  const rows = archiveRows(archive as ArchiveResponse);
  const profile = buildClimateProfile(rows, { fromYear: 2016, toYear: 2025 });

  it("covers every day and validates", () => {
    expect(rows).toHaveLength(3653);
    expect(climateProfileSchema.safeParse(profile).success).toBe(true);
    expect(profile.years).toHaveLength(10);
    expect(profile.frostHeat.perYear).toHaveLength(10);
  });

  it("looks like the Bărăgan plain", () => {
    const july = profile.monthlyNormals[6];
    const january = profile.monthlyNormals[0];
    expect(july.tMean).toBeGreaterThan(20);
    expect(january.tMean).toBeLessThan(5);
    expect(july.waterBalance).toBeLessThan(0); // ET0 far above rain in summer
    expect(profile.gdd[6].base10).toBeGreaterThan(profile.gdd[3].base10);
    expect(profile.frostHeat.summary.lastSpringFrostDoy?.mean).toBeGreaterThan(
      60,
    );
    expect(profile.frostHeat.summary.firstAutumnFrostDoy?.mean).toBeGreaterThan(
      270,
    );
  });

  it("finds a driest 60-day window inside each year", () => {
    for (const y of profile.years) {
      expect(y.driest60DayWindow.from.startsWith(String(y.year))).toBe(true);
      expect(y.driest60DayWindow.to.startsWith(String(y.year))).toBe(true);
      expect(y.driest60DayWindow.precipSum).toBeLessThanOrEqual(y.annualPrecip);
    }
  });
});

describe("buildCurrentSeason", () => {
  const normals = buildClimateProfile(archiveRows(archive as ArchiveResponse), {
    fromYear: 2016,
    toYear: 2025,
  }).monthlyNormals;

  it("scales the running month's precipitation normal to the days observed", () => {
    const rows: DailyRow[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      year: 2026,
      month: 1,
      tMax: 4,
      tMin: 0,
      tMean: 2,
      precip: 0.5,
      et0: 0.1,
    }));
    const stubNormals = normals.map((n) =>
      n.month === 1 ? { ...n, tMean: 0, precipSum: 31 } : n,
    );
    const season = buildCurrentSeason(rows, stubNormals, 2026);
    expect(season.throughDate).toBe("2026-01-10");
    expect(season.monthly).toEqual([
      {
        month: 1,
        tMean: 2,
        precipSum: 5,
        et0: 1,
        waterBalance: 4,
        anomaly: { tMean: 2, precipSum: -5 }, // 5 - 31 * 10/31
      },
    ]);
    expect(season.last30Days).toHaveLength(10);
    expect(season.last30Days[9].date).toBe("2026-01-10");
  });

  it("aggregates the recorded 2026 year to date", () => {
    const season = buildCurrentSeason(
      archiveRows(ytd as ArchiveResponse),
      normals,
      2026,
    );
    expect(currentSeasonSchema.safeParse(season).success).toBe(true);
    expect(season.throughDate).toBe("2026-09-07");
    expect(season.monthly.map((m) => m.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(season.last30Days).toHaveLength(30);
    expect(season.last30Days[29].date).toBe("2026-09-07");
  });

  it("refuses an empty year", () => {
    expect(() => buildCurrentSeason([], normals, 2026)).toThrow(/2026/);
  });
});

describe("windows", () => {
  it("climateSpan is the ten full years before today's year", () => {
    expect(climateSpan("2026-09-12")).toEqual({ fromYear: 2016, toYear: 2025 });
  });

  it("currentSeasonRange stops five days before today for archive latency", () => {
    expect(currentSeasonRange("2026-09-12")).toEqual({
      start: "2026-01-01",
      end: "2026-09-07",
    });
  });
});
