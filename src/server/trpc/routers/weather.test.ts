// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { weatherBriefSchema } from "@/lib/weather/schema";
import { makeCtx } from "../../../../test/trpc";

const getWeatherBrief = vi.hoisted(() => vi.fn());
const refreshClimateProfile = vi.hoisted(() => vi.fn());
const refreshForecast = vi.hoisted(() => vi.fn());

vi.mock("@/lib/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/weather")>();
  return { ...actual, getWeatherBrief, refreshClimateProfile, refreshForecast };
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

// The loading screen shows one step per cache slice (issue 0011).
describe("weather cache-warming procedures", () => {
  it("weather.climate warms the Climate Profile slice and answers small", async () => {
    refreshClimateProfile.mockImplementationOnce(async () => ({
      cellId: "44.6,27.1",
      refreshed: true,
    }));
    const caller = createCaller(makeCtx({ tag: "db" }, null));
    await expect(
      caller.weather.climate({ fieldProfileId: "fp1" }),
    ).resolves.toEqual({ cellId: "44.6,27.1", refreshed: true });
    expect(refreshClimateProfile).toHaveBeenLastCalledWith("fp1", {
      db: { tag: "db" },
    });
    expect(refreshForecast).not.toHaveBeenCalled();
  });

  it("weather.forecast warms the short-range slices", async () => {
    refreshForecast.mockImplementationOnce(async () => ({
      cellId: "44.6,27.1",
      refreshed: false,
    }));
    const caller = createCaller(makeCtx({ tag: "db" }, null));
    await expect(
      caller.weather.forecast({ fieldProfileId: "fp1" }),
    ).resolves.toEqual({ cellId: "44.6,27.1", refreshed: false });
    expect(refreshForecast).toHaveBeenLastCalledWith("fp1", {
      db: { tag: "db" },
    });
  });

  it("maps an Open-Meteo failure the same way the brief does", async () => {
    refreshForecast.mockImplementationOnce(async () => {
      throw new WeatherUnavailableError("forecast", 503, "HTTP 503");
    });
    const caller = createCaller(makeCtx({ tag: "db" }, null));
    await expect(
      caller.weather.forecast({ fieldProfileId: "fp1" }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("maps an unknown profile to NOT_FOUND", async () => {
    refreshClimateProfile.mockImplementationOnce(async () => {
      throw new FieldProfileNotFoundError("ghost");
    });
    const caller = createCaller(makeCtx({ tag: "db" }, null));
    await expect(
      caller.weather.climate({ fieldProfileId: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
