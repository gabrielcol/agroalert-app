// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

describe("geocode router (stub until issue 0004)", () => {
  it("resolves matches with name, lat and lng", async () => {
    const caller = createCaller(makeCtx({}, null));
    const matches = await caller.geocode.search({ query: "Reviga" });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatchObject({
      name: expect.any(String),
      lat: expect.any(Number),
      lng: expect.any(Number),
    });
  });

  it("rejects a query shorter than two characters", async () => {
    const caller = createCaller(makeCtx({}, null));
    await expect(caller.geocode.search({ query: "R" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
