import { describe, expect, it } from "vitest";

import {
  MAX_PLAN_IDS,
  markSownInputSchema,
  sowingPlanIdsInputSchema,
  sowingPlanSchema,
} from "./sowing-plan";

describe("markSownInputSchema", () => {
  it("accepts a profile, a dictionary crop and an optional variety", () => {
    const parsed = markSownInputSchema.parse({
      fieldProfileId: "fp1",
      cropId: "grau_toamna",
      varietyName: "  Glosa ",
    });
    expect(parsed).toEqual({
      fieldProfileId: "fp1",
      cropId: "grau_toamna",
      varietyName: "Glosa",
    });
  });

  it("lets the variety be absent", () => {
    const parsed = markSownInputSchema.parse({
      fieldProfileId: "fp1",
      cropId: "linte",
    });
    expect(parsed.varietyName).toBeUndefined();
  });

  it("rejects a crop that is not in the Crop Dictionary", () => {
    expect(
      markSownInputSchema.safeParse({ fieldProfileId: "fp1", cropId: "banane" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty profile id", () => {
    expect(
      markSownInputSchema.safeParse({ fieldProfileId: "", cropId: "porumb" })
        .success,
    ).toBe(false);
  });
});

describe("sowingPlanSchema", () => {
  it("parses a database row", () => {
    const row = {
      id: "sp1",
      fieldProfileId: "fp1",
      cropId: "porumb",
      varietyName: null,
      sownAt: new Date("2026-09-12T08:00:00Z"),
      createdAt: new Date("2026-09-12T08:00:00Z"),
    };
    expect(sowingPlanSchema.parse(row)).toEqual(row);
  });

  it("rejects a string sownAt", () => {
    expect(
      sowingPlanSchema.safeParse({
        id: "sp1",
        fieldProfileId: "fp1",
        cropId: "porumb",
        varietyName: null,
        sownAt: "2026-09-12",
        createdAt: new Date(),
      }).success,
    ).toBe(false);
  });
});

describe("sowingPlanIdsInputSchema", () => {
  it("accepts an empty list and caps the length", () => {
    expect(sowingPlanIdsInputSchema.parse({ ids: [] }).ids).toEqual([]);
    const tooMany = Array.from({ length: MAX_PLAN_IDS + 1 }, (_, i) => `p${i}`);
    expect(sowingPlanIdsInputSchema.safeParse({ ids: tooMany }).success).toBe(
      false,
    );
  });
});
