// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { formatPlaceName, searchPlaces } from "./open-meteo";

/** Recorded shape of GET /v1/search?name=Reviga&countryCode=RO&language=ro. */
const RECORDED = {
  results: [
    {
      id: 668283,
      name: "Reviga",
      latitude: 44.68333,
      longitude: 27.1,
      elevation: 50,
      feature_code: "PPLA3",
      country_code: "RO",
      admin1_id: 675810,
      admin2_id: 668284,
      timezone: "Europe/Bucharest",
      country_id: 798549,
      country: "România",
      admin1: "Ialomița",
      admin2: "Comuna Reviga",
    },
    {
      id: 668285,
      name: "Reviga Nord",
      latitude: 44.7,
      longitude: 27.12,
      feature_code: "PPL",
      country_code: "RO",
      country: "România",
      admin1: "Ialomița",
    },
  ],
  generationtime_ms: 0.6,
};

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    Response.json(body, { status }),
  ) as unknown as typeof fetch;
}

describe("searchPlaces", () => {
  it("queries Open-Meteo scoped to Romania and maps the results", async () => {
    const fetch = fakeFetch(RECORDED);
    const matches = await searchPlaces("Reviga", { fetch });

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(
      "https://geocoding-api.open-meteo.com/v1/search",
    );
    expect(url.searchParams.get("name")).toBe("Reviga");
    expect(url.searchParams.get("countryCode")).toBe("RO");
    expect(url.searchParams.get("count")).toBe("5");
    expect(url.searchParams.get("language")).toBe("ro");
    expect(url.searchParams.get("format")).toBe("json");

    expect(matches).toEqual([
      { name: "Reviga, Comuna Reviga, Ialomița", lat: 44.68333, lng: 27.1 },
      { name: "Reviga Nord, Ialomița", lat: 44.7, lng: 27.12 },
    ]);
  });

  it("returns an empty list when Open-Meteo has no results", async () => {
    const matches = await searchPlaces("Xyzzy", {
      fetch: fakeFetch({ generationtime_ms: 0.2 }),
    });
    expect(matches).toEqual([]);
  });

  it("drops results outside Romania even if the API returns them", async () => {
    const matches = await searchPlaces("Paris", {
      fetch: fakeFetch({
        results: [
          {
            name: "Paris",
            latitude: 48.85,
            longitude: 2.35,
            country_code: "FR",
          },
        ],
      }),
    });
    expect(matches).toEqual([]);
  });

  it("throws on a non-2xx response", async () => {
    await expect(
      searchPlaces("Reviga", { fetch: fakeFetch({ error: true }, 429) }),
    ).rejects.toThrow(/429/);
  });
});

describe("formatPlaceName", () => {
  it("joins village, commune and county, skipping duplicates and blanks", () => {
    expect(
      formatPlaceName({ name: "Reviga", admin2: "Reviga", admin1: "Ialomița" }),
    ).toBe("Reviga, Ialomița");
    expect(formatPlaceName({ name: "Reviga" })).toBe("Reviga");
    expect(
      formatPlaceName({
        name: "Valea Mare",
        admin3: "Comuna Valea Mare",
        admin2: "Comuna Valea Mare",
        admin1: "Dâmbovița",
      }),
    ).toBe("Valea Mare, Comuna Valea Mare, Dâmbovița");
  });
});
