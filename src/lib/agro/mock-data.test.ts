import { describe, expect, it } from "vitest";

import { CALENDAR_ROWS, CALENDAR_STAGE_DAYS, LOADING_STEPS } from "./mock-data";
import { en } from "@/lib/i18n/dictionaries/en";
import { ro } from "@/lib/i18n/dictionaries/ro";

const DICTIONARIES = { ro, en } as const;
const LOCALES = ["ro", "en"] as const;

describe("LOADING_STEPS", () => {
  it("names the four calls the wizard makes, in the order it makes them", () => {
    expect(LOADING_STEPS).toEqual([
      "location",
      "history",
      "forecast",
      "recommendation",
    ]);
  });

  it.each(LOCALES)("has copy for every step in %s", (locale) => {
    const steps = DICTIONARIES[locale].agro.loading.steps;
    for (const id of LOADING_STEPS) {
      expect(steps[id].length).toBeGreaterThan(0);
    }
  });
});

describe("recommendation copy", () => {
  it.each(LOCALES)(
    "has the card, collapsible and retry strings in %s",
    (locale) => {
      const rec = DICTIONARIES[locale].agro.cultura.recommendation;
      expect(rec.fit).toContain("{n}");
      expect(rec.window).toContain("{from}");
      expect(rec.window).toContain("{to}");
      for (const key of [
        "others",
        "excluded",
        "retry",
        "retryAi",
        "retryTitle",
        "retryAction",
      ] as const) {
        expect(rec[key].length).toBeGreaterThan(0);
      }
      for (const level of ["low", "medium", "high"] as const) {
        expect(rec.confidence[level].length).toBeGreaterThan(0);
      }
    },
  );

  it.each(LOCALES)("has the variety ranking strings in %s", (locale) => {
    const soi = DICTIONARIES[locale].agro.soi;
    expect(soi.titleFor).toContain("{crop}");
    expect(soi.ranking.rank).toContain("{n}");
    expect(soi.ranking.fit).toContain("{n}");
    expect(soi.ranking.empty.length).toBeGreaterThan(0);
  });
});

describe("CALENDAR_ROWS", () => {
  it("has a day offset for every stage, starting at day 0", () => {
    expect(CALENDAR_STAGE_DAYS.sowing).toBe(0);
    for (const id of CALENDAR_ROWS) {
      expect(CALENDAR_STAGE_DAYS[id]).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(LOCALES)(
    "has a title and a sub line for every stage in %s",
    (locale) => {
      const rows = DICTIONARIES[locale].agro.rezumat.calendar.rows;
      for (const id of CALENDAR_ROWS) {
        expect(rows[id].title.length).toBeGreaterThan(0);
        expect(rows[id].sub.length).toBeGreaterThan(0);
      }
    },
  );
});
