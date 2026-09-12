// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { weatherBriefSchema } from "@/lib/weather/schema";
import { makeCtx } from "../../../../test/trpc";

const getWeatherBrief = vi.hoisted(() => vi.fn());

vi.mock("@/lib/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/weather")>();
  return { ...actual, getWeatherBrief };
});

const { FieldProfileNotFoundError, WeatherUnavailableError } =
  await import("@/lib/weather");

async function outcome(fieldProfileId: string) {
  const caller = createCaller(makeCtx({ tag: "db" }, null));
  try {
    return {
      ok: true as const,
      value: await caller.weather.brief({ fieldProfileId }),
    };
  } catch (e) {
    return { ok: false as const, error: e as Error & { code?: string } };
  }
}

describe("weather router", () => {
  it("returns the Weather Brief built for the profile", async () => {
    const brief = weatherBriefFixture("2026-09-12");
    getWeatherBrief.mockImplementationOnce(async () => brief);
    const r = await outcome("fp1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(weatherBriefSchema.safeParse(r.value).success).toBe(true);
    expect(r.value.today).toBe("2026-09-12");
    expect(getWeatherBrief).toHaveBeenLastCalledWith("fp1", {
      db: { tag: "db" },
    });
  });

  it("maps an unknown profile to NOT_FOUND", async () => {
    getWeatherBrief.mockImplementationOnce(async () => {
      throw new FieldProfileNotFoundError("ghost");
    });
    const r = await outcome("ghost");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.name).toBe("TRPCError");
    expect(r.error.code).toBe("NOT_FOUND");
  });

  it("maps an Open-Meteo failure to SERVICE_UNAVAILABLE, never a partial brief", async () => {
    getWeatherBrief.mockImplementationOnce(async () => {
      throw new WeatherUnavailableError("forecast", 429, "rate limited");
    });
    const r = await outcome("fp1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(r.error.message).toContain("rate limited");
  });

  it("lets unexpected errors through as INTERNAL_SERVER_ERROR", async () => {
    getWeatherBrief.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const r = await outcome("fp1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(r.error.message).toBe("boom");
  });
});
