// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import {
  cropRecommendationRecordSchema,
  varietyRecommendationRecordSchema,
} from "@/lib/agro/recommendation-schema";
import { makeCtx } from "../../../../test/trpc";

function fakeDb(profile: { id: string; lat: number; lng: number } | null) {
  return {
    fieldProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
  };
}

describe("recommendation router (stub until issue 0006)", () => {
  it("resolves a Crop Recommendation record in the frozen shape", async () => {
    const caller = createCaller(
      makeCtx(fakeDb({ id: "fp1", lat: 44.7, lng: 27.1 }), null),
    );
    const record = await caller.recommendation.crops({ fieldProfileId: "fp1" });
    expect(cropRecommendationRecordSchema.safeParse(record).success).toBe(true);
    expect(record.fieldProfileId).toBe("fp1");
    expect(record.result.top.length).toBeLessThanOrEqual(3);
    expect(record.result.top[0].cropId).toBe("grau_toamna");
    expect(record.modelId).toBe("claude-sonnet-5");
  });

  it("returns NOT_FOUND for an unknown profile", async () => {
    const caller = createCaller(makeCtx(fakeDb(null), null));
    await expect(
      caller.recommendation.crops({ fieldProfileId: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("resolves a Variety Recommendation record for a dictionary crop", async () => {
    const caller = createCaller(makeCtx(fakeDb(null), null));
    const record = await caller.recommendation.varieties({
      cropRecommendationId: "rec1",
      cropId: "grau_toamna",
    });
    expect(varietyRecommendationRecordSchema.safeParse(record).success).toBe(
      true,
    );
    expect(record.cropId).toBe("grau_toamna");
    expect(record.result.ranked[0].varietyName).toBe("Glosa");
  });

  it("rejects a crop id outside the Crop Dictionary", async () => {
    const caller = createCaller(makeCtx(fakeDb(null), null));
    await expect(
      caller.recommendation.varieties({
        cropRecommendationId: "rec1",
        // Crop ids are typed as string (the enum comes from JSON); the
        // dictionary check is a runtime one.
        cropId: "banane",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
