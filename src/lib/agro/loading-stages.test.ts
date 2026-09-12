import { describe, expect, it } from "vitest";

import { LOADING_STEPS } from "./mock-data";
import {
  allDone,
  nextShown,
  stepProgress,
  stepsThrough,
} from "./loading-stages";

const TOTAL = LOADING_STEPS.length;

describe("stepsThrough", () => {
  it("counts the steps finished once a call has resolved", () => {
    expect(stepsThrough("location")).toBe(1);
    expect(stepsThrough("history")).toBe(2);
    expect(stepsThrough("forecast")).toBe(3);
    expect(stepsThrough("recommendation")).toBe(TOTAL);
  });
});

describe("nextShown", () => {
  it("holds on a step until its own call has resolved", () => {
    expect(nextShown(0, 0, TOTAL)).toBe(0);
    expect(nextShown(1, 1, TOTAL)).toBe(1);
  });

  it("moves one step forward per resolved call, never more", () => {
    expect(nextShown(0, 1, TOTAL)).toBe(1);
    expect(nextShown(0, TOTAL, TOTAL)).toBe(1);
  });

  it("stops on the last step even when everything has resolved", () => {
    expect(nextShown(TOTAL - 1, TOTAL, TOTAL)).toBe(TOTAL - 1);
  });
});

describe("stepProgress", () => {
  it("shows the step as active while its call is in flight", () => {
    expect(stepProgress(2, 2, TOTAL)).toEqual({ index: 2, state: "active" });
  });

  it("shows it as done once its call has come back", () => {
    expect(stepProgress(2, 3, TOTAL)).toEqual({ index: 2, state: "done" });
  });

  it("never points past the last step", () => {
    expect(stepProgress(9, TOTAL, TOTAL).index).toBe(TOTAL - 1);
  });
});

describe("allDone", () => {
  it("is true only after the last call resolved and its step was shown", () => {
    expect(allDone(TOTAL - 1, TOTAL, TOTAL)).toBe(true);
    expect(allDone(TOTAL - 2, TOTAL, TOTAL)).toBe(false);
    expect(allDone(TOTAL - 1, TOTAL - 1, TOTAL)).toBe(false);
  });
});
