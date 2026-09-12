// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { weatherBriefSchema } from "@/lib/weather/schema";
import { makeCtx } from "../../../../test/trpc";

function fakeDb(profile: { lat: number; lng: number } | null) {
  return {
    fieldProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
  };
}

describe("weather router (stub until issue 0005)", () => {
  it("resolves a Weather Brief in the frozen shape for the profile's location", async () => {
    const caller = createCaller(
      makeCtx(fakeDb({ lat: 45.1, lng: 26.9 }), null),
    );
    const brief = await caller.weather.brief({ fieldProfileId: "fp1" });
    expect(weatherBriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.location).toEqual({ lat: 45.1, lng: 26.9 });
    expect(brief.forecast.days).toHaveLength(16);
    expect(brief.seasonalOutlook.weeks.map((w) => w.week)).toEqual([
      3, 4, 5, 6, 7,
    ]);
  });

  it("returns NOT_FOUND for an unknown profile", async () => {
    const caller = createCaller(makeCtx(fakeDb(null), null));
    await expect(
      caller.weather.brief({ fieldProfileId: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
