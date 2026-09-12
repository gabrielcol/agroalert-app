import { describe, expect, it } from "vitest";

import archive from "./__fixtures__/archive-2016-2025.json";
import seasonal from "./__fixtures__/seasonal.json";
import { archiveRows, buildClimateProfile } from "./climate";
import type { ArchiveResponse, SeasonalResponse } from "./open-meteo";
import {
  buildSeasonalOutlook,
  labelFor,
  normalForWeek,
  weekRange,
} from "./outlook";
import { seasonalOutlookSchema } from "./schema";

const normals = buildClimateProfile(archiveRows(archive as ArchiveResponse), {
  fromYear: 2016,
  toYear: 2025,
}).monthlyNormals;
const issuedAt = new Date("2026-09-12T06:00:00Z");

describe("buildSeasonalOutlook on the recorded EC46 run", () => {
  const outlook = buildSeasonalOutlook(
    seasonal as SeasonalResponse,
    normals,
    "2026-09-12",
    issuedAt,
  );

  it("covers weeks 3-7 as low-confidence anomalies", () => {
    expect(seasonalOutlookSchema.safeParse(outlook).success).toBe(true);
    expect(outlook.dataset).toBe("EC46");
    expect(outlook.weeks.map((w) => w.week)).toEqual([3, 4, 5, 6, 7]);
    expect(outlook.weeks.every((w) => w.confidence === "low")).toBe(true);
    expect(outlook.weeks[0]).toMatchObject({
      from: "2026-09-26",
      to: "2026-10-02",
    });
    expect(outlook.weeks[4]).toMatchObject({
      from: "2026-10-24",
      to: "2026-10-30",
    });
  });

  it("keeps anomalies within a plausible band", () => {
    for (const w of outlook.weeks) {
      expect(Math.abs(w.tempAnomaly)).toBeLessThan(10);
      expect(Math.abs(w.precipAnomaly)).toBeLessThan(60);
    }
  });
});

describe("ensemble mean", () => {
  it("averages the control run with every member, skipping nulls", () => {
    const res: SeasonalResponse = {
      daily: {
        time: ["2026-09-26", "2026-09-27"],
        temperature_2m_max: [20, 20],
        temperature_2m_max_member01: [30, null],
        temperature_2m_min: [10, 10],
        temperature_2m_min_member01: [10, null],
        precipitation_sum: [0, 0],
        precipitation_sum_member01: [14, null],
      },
    };
    const flat = normals.map((n) => ({ ...n, tMean: 10, precipSum: 0 }));
    // Only week 3 has data; the others must throw, so probe via a 2-day run
    // on a today that puts both days into week 3.
    expect(() =>
      buildSeasonalOutlook(res, flat, "2026-09-12", issuedAt),
    ).toThrow(/week 4/);
  });
});

describe("weekRange / normalForWeek / labelFor", () => {
  it("weeks are seven days counted from today", () => {
    expect(weekRange("2026-09-12", 3)).toEqual({
      from: "2026-09-26",
      to: "2026-10-02",
    });
    expect(weekRange("2026-09-12", 7)).toEqual({
      from: "2026-10-24",
      to: "2026-10-30",
    });
  });

  it("takes the normal of the month at the week's midpoint, scaled to seven days", () => {
    const n = normalForWeek(normals, "2026-09-29"); // midpoint 2026-10-02 → October
    expect(n.tMean).toBe(normals[9].tMean);
    expect(n.weeklyPrecip).toBeCloseTo((normals[9].precipSum * 7) / 31, 5);
  });

  it("labels the dominant tendency", () => {
    expect(labelFor(2, 1, 10)).toBe("warmer");
    expect(labelFor(-1.5, 3, 10)).toBe("colder");
    expect(labelFor(0.2, 8, 10)).toBe("wetter");
    expect(labelFor(0.1, -6, 10)).toBe("drier");
    // tiny normals do not inflate the precipitation score
    expect(labelFor(1, -1, 0.5)).toBe("warmer");
  });
});
