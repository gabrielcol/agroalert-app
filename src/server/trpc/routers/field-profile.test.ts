// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

const stored = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T10:00:00Z"),
};

function fakeDb(row: typeof stored | null = stored) {
  return {
    fieldProfile: {
      create: vi.fn().mockImplementation(({ data }) => ({
        ...stored,
        ...data,
      })),
      findUnique: vi.fn().mockResolvedValue(row),
    },
  };
}

describe("fieldProfile router", () => {
  it("creates a profile anonymously and returns it", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const created = await caller.fieldProfile.create({
      villageName: "Reviga",
      lat: 44.68,
      lng: 27.11,
      landBucket: "medium",
      irrigation: false,
      soilClass: "cernoziom",
    });
    expect(created.id).toBe("fp1");
    expect(created.soilClass).toBe("cernoziom");
    expect(db.fieldProfile.create).toHaveBeenCalledWith({
      data: {
        villageName: "Reviga",
        lat: 44.68,
        lng: 27.11,
        landBucket: "medium",
        irrigation: false,
        soilClass: "cernoziom",
      },
    });
  });

  it("defaults the soil class to unknown", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const created = await caller.fieldProfile.create({
      villageName: "Reviga",
      lat: 44.68,
      lng: 27.11,
      landBucket: "small",
      irrigation: true,
    });
    expect(created.soilClass).toBe("unknown");
  });

  it("rejects an invalid land bucket", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    await expect(
      caller.fieldProfile.create({
        villageName: "Reviga",
        lat: 44.68,
        lng: 27.11,
        // @ts-expect-error — exercising runtime validation
        landBucket: "huge",
        irrigation: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reads a profile by id", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    const profile = await caller.fieldProfile.get({ id: "fp1" });
    expect(profile).toEqual(stored);
  });

  it("returns NOT_FOUND for an unknown id", async () => {
    const caller = createCaller(makeCtx(fakeDb(null), null));
    await expect(
      caller.fieldProfile.get({ id: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
