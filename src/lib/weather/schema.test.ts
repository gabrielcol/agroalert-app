import { describe, expect, it } from "vitest";

import {
  climateProfileFixture,
  currentSeasonFixture,
  forecastFixture,
  seasonalOutlookFixture,
  weatherBriefFixture,
} from "./fixture";
import {
  climateProfileSchema,
  currentSeasonSchema,
  forecastSchema,
  seasonalOutlookSchema,
  weatherBriefSchema,
} from "./schema";

describe("Weather Brief contract", () => {
  it("parses the fixture round-trip unchanged", () => {
    const brief = weatherBriefFixture("2026-09-12");
    expect(weatherBriefSchema.parse(brief)).toEqual(brief);
    expect(brief.timezone).toBe("Europe/Bucharest");
    expect(brief.units).toBe("metric");
  });

  it("parses each part on its own", () => {
    expect(climateProfileSchema.parse(climateProfileFixture())).toBeTruthy();
    expect(currentSeasonSchema.parse(currentSeasonFixture())).toBeTruthy();
    expect(forecastSchema.parse(forecastFixture())).toBeTruthy();
    expect(seasonalOutlookSchema.parse(seasonalOutlookFixture())).toBeTruthy();
  });

  it("requires twelve monthly normals and twelve GDD rows", () => {
    const profile = climateProfileFixture();
    expect(
      climateProfileSchema.safeParse({
        ...profile,
        monthlyNormals: profile.monthlyNormals.slice(0, 11),
      }).success,
    ).toBe(false);
    expect(
      climateProfileSchema.safeParse({ ...profile, gdd: profile.gdd.slice(1) })
        .success,
    ).toBe(false);
  });

  it("requires exactly sixteen forecast days and seven trusted days", () => {
    const forecast = forecastFixture();
    expect(
      forecastSchema.safeParse({ ...forecast, days: forecast.days.slice(0, 7) })
        .success,
    ).toBe(false);
    expect(
      forecastSchema.safeParse({ ...forecast, trustedDays: 16 }).success,
    ).toBe(false);
  });

  it("rejects a malformed outlook week (missing confidence, wrong label)", () => {
    const outlook = seasonalOutlookFixture();
    const [first, ...rest] = outlook.weeks;
    const withoutConfidence: Partial<typeof first> = { ...first };
    delete withoutConfidence.confidence;
    expect(
      seasonalOutlookSchema.safeParse({
        ...outlook,
        weeks: [withoutConfidence, ...rest],
      }).success,
    ).toBe(false);
    expect(
      seasonalOutlookSchema.safeParse({
        ...outlook,
        weeks: [{ ...first, label: "stormy" }, ...rest],
      }).success,
    ).toBe(false);
    expect(
      seasonalOutlookSchema.safeParse({
        ...outlook,
        weeks: [{ ...first, confidence: "high" }, ...rest],
      }).success,
    ).toBe(false);
  });

  it("covers weeks three to seven", () => {
    expect(seasonalOutlookFixture().weeks.map((w) => w.week)).toEqual([
      3, 4, 5, 6, 7,
    ]);
  });

  it("rejects a bad date format or timezone", () => {
    const brief = weatherBriefFixture();
    expect(
      weatherBriefSchema.safeParse({ ...brief, today: "12/09/2026" }).success,
    ).toBe(false);
    expect(
      weatherBriefSchema.safeParse({ ...brief, timezone: "UTC" }).success,
    ).toBe(false);
  });

  it("keeps the current season inside the year to date", () => {
    const season = currentSeasonFixture("2026-09-12");
    expect(season.year).toBe(2026);
    expect(season.monthly).toHaveLength(9);
    expect(season.last30Days).toHaveLength(30);
    expect(season.throughDate).toBe("2026-09-07");
  });
});
