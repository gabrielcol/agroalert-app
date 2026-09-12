// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import {
  createOpenMeteoWeatherBriefSource,
  fixtureWeatherBriefSource,
} from "./weather-brief-source";

const profile: FieldProfile = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T10:00:00Z"),
};

describe("createOpenMeteoWeatherBriefSource", () => {
  it("asks getWeatherBrief for the profile's id with the injected db and clock", async () => {
    const brief = weatherBriefFixture("2026-09-12");
    const getBrief = vi.fn().mockResolvedValue(brief);
    const db = {} as never;
    const now = () => new Date("2026-09-12T08:00:00Z");
    const source = createOpenMeteoWeatherBriefSource({ db, getBrief, now });

    await expect(source(profile, "2026-09-12")).resolves.toBe(brief);
    expect(getBrief).toHaveBeenCalledWith("fp1", { db, now });
  });

  it("lets the producer's errors through untouched for the service to map", async () => {
    const boom = new Error("open-meteo down");
    const getBrief = vi.fn().mockRejectedValue(boom);
    const source = createOpenMeteoWeatherBriefSource({
      db: {} as never,
      getBrief,
    });
    await expect(source(profile, "2026-09-12")).rejects.toBe(boom);
  });
});

describe("fixtureWeatherBriefSource", () => {
  it("centres the foundation fixture on the Field Location, dated today", async () => {
    const brief = await fixtureWeatherBriefSource(profile, "2026-09-12");
    expect(brief.today).toBe("2026-09-12");
    expect(brief.location).toEqual({ lat: 44.68, lng: 27.11 });
  });
});
