import { describe, expect, it } from "vitest";

import {
  cropDisplayName,
  cropIdFromParam,
  fill,
  formatLongDate,
  formatShortDate,
  wizardPath,
} from "./recommendation-ui";

describe("wizardPath", () => {
  it("builds the wizard URL contract in a fixed order, skipping empty values", () => {
    expect(wizardPath("cultura", { profile: "fp1" })).toBe(
      "/plan/cultura?profile=fp1",
    );
    expect(
      wizardPath("soi", {
        profile: "fp1",
        recommendation: "rec1",
        crop: "grau_toamna",
      }),
    ).toBe("/plan/soi?profile=fp1&rec=rec1&crop=grau_toamna");
    expect(wizardPath("rezumat", { profile: "fp1", variety: null })).toBe(
      "/plan/rezumat?profile=fp1",
    );
    expect(wizardPath("teren", {})).toBe("/plan/teren");
  });
});

describe("cropIdFromParam", () => {
  it("accepts dictionary ids and rejects the rest", () => {
    expect(cropIdFromParam("grau_toamna")).toBe("grau_toamna");
    expect(cropIdFromParam("banane")).toBeNull();
    expect(cropIdFromParam(null)).toBeNull();
  });
});

describe("display helpers", () => {
  it("names a crop in the viewer's locale", () => {
    expect(cropDisplayName("grau_toamna", "ro")).toBe("Grâu de toamnă");
    expect(cropDisplayName("grau_toamna", "en")).toBe("Winter wheat");
  });

  it("formats ISO dates as day + short month", () => {
    // en-US puts the month first ("Oct 1"), ro the day ("1 oct.").
    expect(formatShortDate("2026-10-01", "en")).toMatch(/Oct\b.*1|1\b.*Oct/);
    expect(formatShortDate("2026-10-01", "ro")).toMatch(/^1 oct/);
    expect(formatShortDate("not-a-date", "ro")).toBe("not-a-date");
  });

  it("formats a Date as a full long date in the viewer's locale", () => {
    const date = new Date(2026, 8, 12, 15, 30);
    expect(formatLongDate(date, "ro")).toBe("12 septembrie 2026");
    expect(formatLongDate(date, "en")).toBe("September 12, 2026");
  });

  it("fills placeholders", () => {
    expect(fill("Potrivire {n}%", { n: 86 })).toBe("Potrivire 86%");
    expect(fill("{from} – {to}", { from: "a", to: "b" })).toBe("a – b");
  });
});
