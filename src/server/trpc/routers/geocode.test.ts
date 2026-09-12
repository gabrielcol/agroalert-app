// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

const RECORDED = {
  results: [
    {
      name: "Reviga",
      latitude: 44.68333,
      longitude: 27.1,
      country_code: "RO",
      admin1: "Ialomița",
      admin2: "Comuna Reviga",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("geocode router", () => {
  it("resolves matches with name, lat and lng from Open-Meteo", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      void input;
      return Response.json(RECORDED);
    });
    vi.stubGlobal("fetch", fetchMock);

    const caller = createCaller(makeCtx({}, null));
    const matches = await caller.geocode.search({ query: "Reviga" });

    expect(matches).toEqual([
      { name: "Reviga, Comuna Reviga, Ialomița", lat: 44.68333, lng: 27.1 },
    ]);
    const url = new URL(fetchMock.mock.calls[0]![0]);
    expect(url.searchParams.get("countryCode")).toBe("RO");
  });

  it("rejects a query shorter than two characters", async () => {
    const caller = createCaller(makeCtx({}, null));
    await expect(caller.geocode.search({ query: "R" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("maps an upstream failure to BAD_GATEWAY", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: 503 })),
    );
    const caller = createCaller(makeCtx({}, null));
    await expect(
      caller.geocode.search({ query: "Reviga" }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });
});
