import { describe, expect, it } from "vitest";

import forecastFixture from "./__fixtures__/forecast.json";
import { buildForecast } from "./forecast";
import type { ForecastResponse } from "./open-meteo";
import { forecastSchema } from "./schema";

const res = forecastFixture as ForecastResponse;
const issuedAt = new Date("2026-09-12T08:00:00Z");

describe("buildForecast on the recorded response", () => {
  const forecast = buildForecast(res, "2026-09-12", issuedAt);

  it("returns exactly 16 days starting today, 7 trusted", () => {
    expect(forecastSchema.safeParse(forecast).success).toBe(true);
    expect(forecast.days).toHaveLength(16);
    expect(forecast.days[0].date).toBe("2026-09-12");
    expect(forecast.days[15].date).toBe("2026-09-27");
    expect(forecast.trustedDays).toBe(7);
    expect(forecast.issuedAt).toBe("2026-09-12T08:00:00.000Z");
  });

  it("copies the daily variables and derives the water balance", () => {
    const i = res.daily.time.indexOf("2026-09-12");
    const day = forecast.days[0];
    expect(day.tMax).toBe(res.daily.temperature_2m_max?.[i]);
    expect(day.tMin).toBe(res.daily.temperature_2m_min?.[i]);
    expect(day.precipProbability).toBe(
      res.daily.precipitation_probability_max?.[i],
    );
    expect(day.weatherCode).toBe(res.daily.weather_code?.[i]);
    expect(day.waterBalance).toBeCloseTo(day.precipSum - day.et0, 1);
  });

  it("averages the hourly soil layers per day", () => {
    const hours = res.hourly.time
      .map((t, i) => [t, res.hourly.soil_temperature_6cm?.[i]] as const)
      .filter(([t, v]) => t.startsWith("2026-09-12") && v != null)
      .map(([, v]) => v as number);
    const expected = hours.reduce((a, b) => a + b, 0) / hours.length;
    expect(forecast.days[0].soilTemp0_9cm).toBeCloseTo(expected, 1);
    expect(forecast.days[0].soilMoisture0_9cm).toBeGreaterThan(0);
    expect(forecast.days[0].soilMoisture0_9cm).toBeLessThan(1);
  });

  it("carries the last known soil value forward when the model stops publishing it", () => {
    const lastWithSoil = res.hourly.time
      .filter((_, i) => res.hourly.soil_temperature_6cm?.[i] != null)
      .at(-1)!
      .slice(0, 10);
    expect(lastWithSoil < "2026-09-27").toBe(true);
    const known = forecast.days.find((d) => d.date === lastWithSoil)!;
    expect(forecast.days[15].soilTemp0_9cm).toBe(known.soilTemp0_9cm);
    expect(forecast.days[15].soilMoisture0_9cm).toBe(known.soilMoisture0_9cm);
  });
});

describe("buildForecast failures", () => {
  it("refuses a response that does not cover 16 days from today", () => {
    expect(() => buildForecast(res, "2026-09-20", issuedAt)).toThrow(/16 days/);
    expect(() => buildForecast(res, "2026-01-01", issuedAt)).toThrow(/16 days/);
  });

  it("refuses a response with no soil data at all", () => {
    const noSoil: ForecastResponse = {
      daily: res.daily,
      hourly: { time: res.hourly.time },
    };
    expect(() => buildForecast(noSoil, "2026-09-12", issuedAt)).toThrow(/soil/);
  });
});
