import { describe, expect, it, vi } from "vitest";

import {
  archiveUrl,
  createOpenMeteoClient,
  forecastUrl,
  seasonalUrl,
  WeatherUnavailableError,
  type FetchLike,
} from "./open-meteo";

const point = { lat: 44.6, lng: 27.1 };

function params(url: string) {
  return new URL(url).searchParams;
}

describe("Open-Meteo URLs", () => {
  it("archive asks for the daily variables over the given range in Bucharest time", () => {
    const p = params(archiveUrl(point, "2016-01-01", "2025-12-31"));
    expect(p.get("latitude")).toBe("44.6");
    expect(p.get("longitude")).toBe("27.1");
    expect(p.get("start_date")).toBe("2016-01-01");
    expect(p.get("end_date")).toBe("2025-12-31");
    expect(p.get("daily")?.split(",")).toEqual([
      "temperature_2m_max",
      "temperature_2m_min",
      "temperature_2m_mean",
      "precipitation_sum",
      "et0_fao_evapotranspiration",
    ]);
    expect(p.get("timezone")).toBe("Europe/Bucharest");
    // The default model blend: era5_land alone returns null precipitation.
    expect(p.get("models")).toBeNull();
  });

  it("forecast asks for 16 days ahead, 30 past days and the soil layers", () => {
    const p = params(forecastUrl(point));
    expect(p.get("forecast_days")).toBe("16");
    expect(p.get("past_days")).toBe("30");
    expect(p.get("daily")).toContain("precipitation_probability_max");
    expect(p.get("daily")).toContain("weather_code");
    expect(p.get("hourly")?.split(",")).toEqual([
      "soil_temperature_6cm",
      "soil_moisture_3_to_9cm",
    ]);
  });

  it("seasonal asks for EC46 over 46 days", () => {
    const p = params(seasonalUrl(point));
    expect(p.get("models")).toBe("ecmwf_ec46");
    expect(p.get("forecast_days")).toBe("46");
    expect(p.get("daily")?.split(",")).toEqual([
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
    ]);
  });
});

function fetchWith(res: Partial<Response> | Error): FetchLike {
  return vi.fn(async () => {
    if (res instanceof Error) throw res;
    return { ok: true, status: 200, json: async () => ({}), ...res };
  }) as unknown as FetchLike;
}

describe("Open-Meteo client failures", () => {
  it("maps a 429 to WeatherUnavailableError with the status", async () => {
    const client = createOpenMeteoClient(fetchWith({ ok: false, status: 429 }));
    const err = await client.forecast(point).catch((e) => e);
    expect(err).toBeInstanceOf(WeatherUnavailableError);
    expect(err.status).toBe(429);
    expect(err.endpoint).toBe("forecast");
    expect(err.message).toContain("rate limited");
  });

  it("maps a non-2xx to WeatherUnavailableError", async () => {
    const client = createOpenMeteoClient(fetchWith({ ok: false, status: 503 }));
    await expect(
      client.archive(point, "2020-01-01", "2020-01-02"),
    ).rejects.toMatchObject({
      name: "WeatherUnavailableError",
      status: 503,
    });
  });

  it("maps a network error to WeatherUnavailableError", async () => {
    const client = createOpenMeteoClient(fetchWith(new Error("ECONNRESET")));
    await expect(client.seasonal(point)).rejects.toMatchObject({
      name: "WeatherUnavailableError",
      status: null,
    });
  });

  it("treats an `error: true` body as unavailable", async () => {
    const client = createOpenMeteoClient(
      fetchWith({
        json: async () => ({ error: true, reason: "Invalid value" }),
      }),
    );
    await expect(client.forecast(point)).rejects.toThrow(/Invalid value/);
  });

  it("returns the parsed body on success", async () => {
    const body = { daily: { time: ["2026-09-12"] } };
    const client = createOpenMeteoClient(fetchWith({ json: async () => body }));
    await expect(client.forecast(point)).resolves.toEqual(body);
  });
});
