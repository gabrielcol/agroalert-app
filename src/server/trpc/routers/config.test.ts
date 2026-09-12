// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

const validInput = {
  defaultLocale: "ro" as const,
  siteName: "Acme HQ",
};

function fakeDb() {
  const db = {
    systemConfig: {
      findUnique: vi.fn().mockResolvedValue({
        id: "singleton",
        defaultLocale: "en",
        siteName: "Acme",
      }),
      upsert: vi.fn().mockImplementation(({ update }) => ({
        id: "singleton",
        ...update,
      })),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return db;
}

describe("config router — system config", () => {
  it("blocks unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    await expect(caller.config.getSystem()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("forbids reads without system-config:read", async () => {
    const caller = createCaller(makeCtx(fakeDb(), { role: "pending" }));
    await expect(caller.config.getSystem()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets an admin read the system config", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { role: "admin" }));
    const cfg = await caller.config.getSystem();
    expect(cfg.defaultLocale).toBe("en");
    expect(db.systemConfig.findUnique).toHaveBeenCalledOnce();
  });

  it("falls back to schema defaults when the singleton row is missing", async () => {
    const db = fakeDb();
    db.systemConfig.findUnique.mockResolvedValueOnce(null);
    const caller = createCaller(makeCtx(db, { role: "admin" }));
    const cfg = await caller.config.getSystem();
    expect(cfg).toMatchObject({
      id: "singleton",
      defaultLocale: "ro",
      siteName: "",
    });
  });

  it("forbids updates without system-config:update", async () => {
    const db = fakeDb();
    for (const role of ["auditor", "member"]) {
      const caller = createCaller(makeCtx(db, { role }));
      await expect(
        caller.config.updateSystem(validInput),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(db.systemConfig.upsert).not.toHaveBeenCalled();
  });

  it("updates the config and audits field-level changes", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { id: "a1", role: "admin" }));
    const cfg = await caller.config.updateSystem(validInput);
    expect(cfg.defaultLocale).toBe("ro");
    expect(db.systemConfig.upsert).toHaveBeenCalledOnce();
    const audit = db.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      actorId: "a1",
      actorRole: "admin",
      action: "system.update_config",
      resourceType: "system-config",
    });
    expect(JSON.parse(audit.metadata)).toEqual({
      changes: {
        defaultLocale: { from: "en", to: "ro" },
        siteName: { from: "Acme", to: "Acme HQ" },
      },
    });
  });

  it("rejects an unknown locale", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { role: "admin" }));
    await expect(
      caller.config.updateSystem({
        ...validInput,
        defaultLocale: "xx" as never,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.systemConfig.upsert).not.toHaveBeenCalled();
  });

  it("fails closed: a failed audit rolls the update back", async () => {
    const db = fakeDb();
    db.auditLog.create.mockRejectedValueOnce(new Error("audit down"));
    const caller = createCaller(makeCtx(db, { id: "a1", role: "admin" }));
    await expect(caller.config.updateSystem(validInput)).rejects.toThrow(
      "audit down",
    );
    expect(db.systemConfig.upsert).toHaveBeenCalledOnce();
  });
});
