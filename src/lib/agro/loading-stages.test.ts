import { describe, expect, it } from "vitest";

import { LOADING_STEPS } from "./mock-data";
import { nextStarted, stageState } from "./loading-stages";

const TOTAL = LOADING_STEPS.length;

describe("nextStarted", () => {
  it("holds on the location stage until the Field Location resolves", () => {
    expect(
      nextStarted(0, { locationDone: false, settled: false, total: TOTAL }),
    ).toBe(1);
    expect(
      nextStarted(1, { locationDone: false, settled: false, total: TOTAL }),
    ).toBe(1);
  });

  it("moves past the location stage as soon as it resolves", () => {
    expect(
      nextStarted(1, { locationDone: true, settled: false, total: TOTAL }),
    ).toBe(2);
  });

  it("advances one stage per tick while the recommendation is pending", () => {
    expect(
      nextStarted(2, { locationDone: true, settled: false, total: TOTAL }),
    ).toBe(3);
    expect(
      nextStarted(5, { locationDone: true, settled: false, total: TOTAL }),
    ).toBe(6);
  });

  it("never runs past the last stage while still pending", () => {
    expect(
      nextStarted(6, { locationDone: true, settled: false, total: TOTAL }),
    ).toBe(6);
  });

  it("completes every stage once the recommendation settles", () => {
    expect(
      nextStarted(3, { locationDone: true, settled: true, total: TOTAL }),
    ).toBe(TOTAL + 1);
    expect(
      nextStarted(6, { locationDone: true, settled: true, total: TOTAL }),
    ).toBe(TOTAL + 1);
  });
});

describe("stageState", () => {
  it("marks stages before the started one as done and the started one active", () => {
    expect(stageState(3, 0)).toBe("done");
    expect(stageState(3, 1)).toBe("done");
    expect(stageState(3, 2)).toBe("active");
    expect(stageState(3, 3)).toBe("pending");
  });
});
