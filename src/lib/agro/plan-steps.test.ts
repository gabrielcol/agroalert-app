import { describe, expect, it } from "vitest";

import {
  DASHBOARD_PATH,
  PLAN_STEPS,
  nextStepPath,
  planStepIndex,
  planStepPath,
  previousStepPath,
} from "./plan-steps";

describe("plan steps", () => {
  it("defines the four wizard steps in order", () => {
    expect(PLAN_STEPS).toEqual(["teren", "cultura", "soi", "rezumat"]);
  });

  it("maps every step to a /plan/<step> path", () => {
    expect(planStepPath("teren")).toBe("/plan/teren");
    expect(planStepPath("rezumat")).toBe("/plan/rezumat");
  });

  it("numbers steps from 1 for the progress label", () => {
    expect(planStepIndex("teren")).toBe(1);
    expect(planStepIndex("rezumat")).toBe(4);
  });

  it("goes back to the dashboard from the first step", () => {
    expect(previousStepPath("teren")).toBe(DASHBOARD_PATH);
    expect(previousStepPath("cultura")).toBe("/plan/teren");
    expect(previousStepPath("soi")).toBe("/plan/cultura");
  });

  it("returns to the dashboard from the plan summary (its back arrow leaves the wizard)", () => {
    expect(previousStepPath("rezumat")).toBe(DASHBOARD_PATH);
  });

  it("advances to the next step and stops at the last one", () => {
    expect(nextStepPath("teren")).toBe("/plan/cultura");
    expect(nextStepPath("soi")).toBe("/plan/rezumat");
    expect(nextStepPath("rezumat")).toBeNull();
  });
});
