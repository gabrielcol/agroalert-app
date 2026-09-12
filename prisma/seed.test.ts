// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { SEED_SYSTEM_CONFIG, seedDatabase } from "./seed-data";

function fakeDb() {
  return { systemConfig: { upsert: vi.fn().mockResolvedValue({}) } };
}

describe("seed data", () => {
  it("upserts the system config singleton without overwriting edits", async () => {
    const db = fakeDb();
    await seedDatabase(db as unknown as PrismaClient);
    expect(db.systemConfig.upsert).toHaveBeenCalledOnce();
    const args = db.systemConfig.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ id: "singleton" });
    expect(args.create).toEqual(SEED_SYSTEM_CONFIG);
    // An existing row is left untouched so re-seeding never clobbers admin edits.
    expect(args.update).toEqual({});
  });

  it("is idempotent across repeated runs", async () => {
    const db = fakeDb();
    await seedDatabase(db as unknown as PrismaClient);
    await seedDatabase(db as unknown as PrismaClient);
    expect(db.systemConfig.upsert).toHaveBeenCalledTimes(2);
    expect(db.systemConfig.upsert.mock.calls[0][0]).toEqual(
      db.systemConfig.upsert.mock.calls[1][0],
    );
  });
});
