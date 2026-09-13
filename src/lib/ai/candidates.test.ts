import { describe, expect, it } from "vitest";

import {
  candidateCropIds,
  formatDayRo,
  nextSowingWindow,
  qualifyingWindows,
} from "./candidates";

function crop(id: string, windows: { from: string; to: string }[]) {
  return {
    id,
    calendar: {
      sowing_windows: windows.map((w, i) => ({ zone: `zone ${i}`, ...w })),
    },
  };
}

const TODAY = "2026-09-12";

describe("46-day candidate rule", () => {
  it("accepts a window that is open today", () => {
    const c = crop("rapita", [{ from: "09-01", to: "09-15" }]);
    expect(qualifyingWindows(c, TODAY)).toEqual([
      {
        cropId: "rapita",
        zone: "zone 0",
        from: "2026-09-01",
        to: "2026-09-15",
      },
    ]);
  });

  it("accepts a window opening within 46 days (day 46 inclusive)", () => {
    const c = crop("grau", [{ from: "10-28", to: "11-05" }]); // opens day 46
    expect(qualifyingWindows(c, TODAY)).toHaveLength(1);
  });

  it("rejects a window opening on day 50", () => {
    const c = crop("late", [{ from: "11-01", to: "11-10" }]); // opens day 50
    expect(qualifyingWindows(c, TODAY)).toEqual([]);
    expect(candidateCropIds(TODAY, { crops: [c] })).toEqual([]);
  });

  it("rejects a spring window in autumn but accepts it in March", () => {
    const porumb = crop("porumb", [{ from: "04-10", to: "05-05" }]);
    expect(candidateCropIds(TODAY, { crops: [porumb] })).toEqual([]);
    expect(candidateCropIds("2026-03-01", { crops: [porumb] })).toEqual([
      "porumb",
    ]);
  });

  it("handles a window that wraps the year end", () => {
    const c = crop("wrap", [{ from: "12-20", to: "01-10" }]);
    expect(candidateCropIds("2026-12-25", { crops: [c] })).toEqual(["wrap"]);
    expect(candidateCropIds("2027-01-05", { crops: [c] })).toEqual(["wrap"]);
    expect(candidateCropIds("2026-09-12", { crops: [c] })).toEqual([]);
  });

  it("keeps dictionary order and ignores crops without windows", () => {
    const crops = [
      crop("b", [{ from: "09-20", to: "10-01" }]),
      { id: "none", calendar: { sowing_windows: [] } },
      crop("a", [{ from: "10-01", to: "10-10" }]),
    ];
    expect(candidateCropIds(TODAY, { crops })).toEqual(["b", "a"]);
  });

  it("finds the autumn cereals and drops the spring crops in mid-September on the real dictionary", () => {
    const ids = candidateCropIds(TODAY);
    expect(ids).toContain("grau_toamna");
    expect(ids).toContain("orz_toamna");
    expect(ids).not.toContain("porumb");
    expect(ids).not.toContain("floarea_soarelui");
  });
});

describe("nextSowingWindow (issue 0020)", () => {
  it("answers the earliest window opening strictly after today, across zones", () => {
    const crop = {
      id: "x",
      calendar: {
        sowing_windows: [
          { zone: "north", from: "04-20", to: "04-30" },
          { zone: "south", from: "04-01", to: "04-20" },
          { zone: "open-now", from: "09-01", to: "09-30" },
        ],
      },
    };
    // The September window is open today, so it does not count as "next".
    expect(nextSowingWindow(crop, TODAY)).toEqual({
      zone: "south",
      from: "2027-04-01",
      to: "2027-04-20",
    });
    expect(nextSowingWindow({ id: "none" }, TODAY)).toBeNull();
  });

  it("formats a day in Romanian", () => {
    expect(formatDayRo("2027-04-01")).toBe("1 aprilie");
    expect(formatDayRo("2026-12-25")).toBe("25 decembrie");
  });
});
