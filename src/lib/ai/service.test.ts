// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import {
  FieldProfileNotFoundError,
  WeatherUnavailableError as OpenMeteoUnavailableError,
} from "@/lib/weather";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { WeatherUnavailableError } from "./errors";
import { createRecommendationService } from "./service";

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

function failingBriefService(source: () => Promise<never>) {
  const createClient = vi.fn(() => {
    throw new Error("the model must not be called when the brief fails");
  });
  return createRecommendationService({
    createClient,
    weatherBriefSource: source,
    model: "claude-sonnet-5",
    today: () => "2026-09-12",
  });
}

describe("createRecommendationService().crops — Weather Brief failures", () => {
  it("wraps the weather module's WeatherUnavailableError in the recommendation one, keeping the cause", async () => {
    const cause = new OpenMeteoUnavailableError("archive", 503, "rate limited");
    const svc = failingBriefService(() => Promise.reject(cause));
    const error = await svc.crops(profile).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WeatherUnavailableError);
    expect((error as WeatherUnavailableError).cause).toBe(cause);
  });

  it("lets FieldProfileNotFoundError through so the router answers NOT_FOUND", async () => {
    const cause = new FieldProfileNotFoundError("fp1");
    const svc = failingBriefService(() => Promise.reject(cause));
    await expect(svc.crops(profile)).rejects.toBe(cause);
  });

  it("treats any other failure as an unavailable brief (no degraded recommendation)", async () => {
    const svc = failingBriefService(() =>
      Promise.reject(new Error("socket hang up")),
    );
    await expect(svc.crops(profile)).rejects.toBeInstanceOf(
      WeatherUnavailableError,
    );
  });

  it("anchors the model call on the brief's own day, not the service clock", async () => {
    const brief = weatherBriefFixture("2026-09-13");
    const create = vi.fn().mockResolvedValue({ content: [] });
    const svc = createRecommendationService({
      createClient: () => ({ messages: { create } }) as never,
      weatherBriefSource: async () => brief,
      model: "claude-sonnet-5",
      today: () => "2026-09-12",
    });
    // The fake client answers nothing usable; only the request is inspected.
    await svc.crops(profile).catch(() => undefined);
    expect(create).toHaveBeenCalledTimes(1);
    const request = JSON.stringify(create.mock.calls[0]?.[0]);
    expect(request).toContain("2026-09-13");
    expect(request).not.toContain("2026-09-12");
  });
});
