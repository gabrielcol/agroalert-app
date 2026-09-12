import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  nextStage,
  stageDates,
  stageOffsets,
  startOfDay,
} from "./crop-calendar";

const SOWN = new Date(2026, 8, 12, 14, 30); // 12 Sep 2026, local time

describe("stageOffsets", () => {
  it("accumulates the per-stage day counts from the Sowing Date", () => {
    expect(stageOffsets()).toEqual([
      { id: "sowing", offsetDays: 0 },
      { id: "emergence", offsetDays: 10 },
      { id: "spring", offsetDays: 160 },
      { id: "treatments", offsetDays: 220 },
      { id: "harvest", offsetDays: 270 },
    ]);
  });
});

describe("day arithmetic", () => {
  it("startOfDay returns local midnight without mutating the input", () => {
    const start = startOfDay(SOWN);
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(12);
    expect(SOWN.getHours()).toBe(14);
  });

  it("addDays keeps the calendar day across a DST change", () => {
    // Romania leaves DST on 25 Oct 2026; 20 Oct + 10 days must be 30 Oct.
    const before = new Date(2026, 9, 20, 9, 0);
    const after = addDays(before, 10);
    expect([after.getMonth(), after.getDate(), after.getHours()]).toEqual([
      9, 30, 9,
    ]);
  });

  it("daysBetween counts whole calendar days, ignoring the time of day", () => {
    expect(daysBetween(SOWN, new Date(2026, 8, 22, 1, 0))).toBe(10);
    expect(daysBetween(new Date(2026, 8, 22), SOWN)).toBe(-10);
    expect(daysBetween(SOWN, new Date(2026, 8, 12, 23, 59))).toBe(0);
  });

  it("daysBetween is exact across the DST change", () => {
    expect(daysBetween(new Date(2026, 9, 20), new Date(2026, 9, 30))).toBe(10);
  });
});

describe("stageDates", () => {
  it("places every stage on the calendar from local midnight of the Sowing Date", () => {
    const dates = stageDates(SOWN);
    expect(dates.map((d) => d.id)).toEqual([
      "sowing",
      "emergence",
      "spring",
      "treatments",
      "harvest",
    ]);
    expect(dates[0].date).toEqual(new Date(2026, 8, 12));
    expect(dates[1].date).toEqual(new Date(2026, 8, 22));
    expect(dates[4].date).toEqual(new Date(2027, 5, 9)); // +270 days
  });
});

describe("nextStage", () => {
  it("is the sowing stage, due today, on the Sowing Date", () => {
    expect(nextStage(SOWN, new Date(2026, 8, 12, 20, 0))).toEqual({
      id: "sowing",
      daysUntil: 0,
    });
  });

  it("skips past stages and counts the days to the next one", () => {
    expect(nextStage(SOWN, new Date(2026, 8, 23))).toEqual({
      id: "spring",
      daysUntil: 149,
    });
  });

  it("is the stage itself on its due day", () => {
    expect(nextStage(SOWN, new Date(2026, 8, 22))).toEqual({
      id: "emergence",
      daysUntil: 0,
    });
  });

  it("is null once the harvest is behind us", () => {
    expect(nextStage(SOWN, new Date(2027, 5, 10))).toBeNull();
  });
});
