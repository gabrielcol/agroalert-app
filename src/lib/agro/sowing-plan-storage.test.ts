import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_PLAN_IDS } from "./sowing-plan";
import {
  SOWING_PLAN_IDS_KEY,
  addSowingPlanId,
  readSowingPlanIds,
  useSowingPlanIds,
} from "./sowing-plan-storage";

describe("sowing plan id storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads an empty list when nothing is stored", () => {
    expect(readSowingPlanIds()).toEqual([]);
  });

  it("ignores garbage and non-string entries", () => {
    window.localStorage.setItem(SOWING_PLAN_IDS_KEY, "{not json");
    expect(readSowingPlanIds()).toEqual([]);
    window.localStorage.setItem(
      SOWING_PLAN_IDS_KEY,
      JSON.stringify([1, "", null, "sp1"]),
    );
    expect(readSowingPlanIds()).toEqual(["sp1"]);
  });

  it("prepends, de-duplicates and caps the list", () => {
    addSowingPlanId("a");
    addSowingPlanId("b");
    addSowingPlanId("a");
    expect(readSowingPlanIds()).toEqual(["a", "b"]);

    for (let i = 0; i < MAX_PLAN_IDS + 5; i++) addSowingPlanId(`p${i}`);
    const ids = readSowingPlanIds();
    expect(ids).toHaveLength(MAX_PLAN_IDS);
    expect(ids[0]).toBe(`p${MAX_PLAN_IDS + 4}`);
  });

  it("falls back to an empty list when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    expect(readSowingPlanIds()).toEqual([]);
    expect(() => addSowingPlanId("x")).not.toThrow();
  });

  it("useSowingPlanIds re-renders when a plan is added", () => {
    const { result } = renderHook(() => useSowingPlanIds());
    expect(result.current).toEqual([]);
    const first = result.current;

    act(() => addSowingPlanId("sp1"));
    expect(result.current).toEqual(["sp1"]);

    // Stable snapshot: the same list instance until the stored value changes.
    const second = result.current;
    expect(result.current).toBe(second);
    expect(first).not.toBe(second);
  });
});
