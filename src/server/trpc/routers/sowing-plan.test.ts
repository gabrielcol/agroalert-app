// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

const NOW = new Date("2026-09-12T08:00:00Z");

const stored = {
  id: "sp1",
  fieldProfileId: "fp1",
  cropId: "grau_toamna",
  varietyName: "Glosa",
  sownAt: NOW,
  createdAt: NOW,
};

function fakeDb({
  profile = { id: "fp1" } as { id: string } | null,
  plan = stored as typeof stored | null,
  plans = [stored] as (typeof stored)[],
} = {}) {
  return {
    fieldProfile: {
      findUnique: vi.fn().mockResolvedValue(profile),
    },
    sowingPlan: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "sp1",
        createdAt: NOW,
        ...data,
      })),
      findFirst: vi.fn().mockResolvedValue(plan),
      findMany: vi.fn().mockResolvedValue(plans),
    },
  };
}

describe("sowingPlan router", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("markSown creates the plan with a server-side sowing date", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const plan = await caller.sowingPlan.markSown({
      fieldProfileId: "fp1",
      cropId: "grau_toamna",
      varietyName: "Glosa",
    });
    expect(plan).toEqual(stored);
    expect(db.sowingPlan.create).toHaveBeenCalledWith({
      data: {
        fieldProfileId: "fp1",
        cropId: "grau_toamna",
        varietyName: "Glosa",
        sownAt: NOW,
      },
    });
  });

  it("markSown stores a missing variety as null", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const plan = await caller.sowingPlan.markSown({
      fieldProfileId: "fp1",
      cropId: "linte",
    });
    expect(plan.varietyName).toBeNull();
  });

  it("markSown returns NOT_FOUND for an unknown profile", async () => {
    const db = fakeDb({ profile: null });
    const caller = createCaller(makeCtx(db, null));
    await expect(
      caller.sowingPlan.markSown({ fieldProfileId: "ghost", cropId: "porumb" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.sowingPlan.create).not.toHaveBeenCalled();
  });

  it("markSown rejects a crop outside the Crop Dictionary", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    await expect(
      caller.sowingPlan.markSown({
        fieldProfileId: "fp1",
        // @ts-expect-error — exercising runtime validation
        cropId: "banane",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("latestByProfile returns the newest plan for the profile", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const plan = await caller.sowingPlan.latestByProfile({
      fieldProfileId: "fp1",
    });
    expect(plan).toEqual(stored);
    expect(db.sowingPlan.findFirst).toHaveBeenCalledWith({
      where: { fieldProfileId: "fp1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("latestByProfile returns null when the profile has no plan", async () => {
    const caller = createCaller(makeCtx(fakeDb({ plan: null }), null));
    expect(
      await caller.sowingPlan.latestByProfile({ fieldProfileId: "fp1" }),
    ).toBeNull();
  });

  it("byIds returns an empty list without touching the database", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    expect(await caller.sowingPlan.byIds({ ids: [] })).toEqual([]);
    expect(db.sowingPlan.findMany).not.toHaveBeenCalled();
  });

  it("byIds looks up the given ids newest first", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, null));
    const plans = await caller.sowingPlan.byIds({ ids: ["sp1", "ghost"] });
    expect(plans).toEqual([stored]);
    expect(db.sowingPlan.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["sp1", "ghost"] } },
      orderBy: { createdAt: "desc" },
    });
  });
});
