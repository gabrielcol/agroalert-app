// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

function fakeDb() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "a1",
          createdAt: new Date(),
          actorId: "u1",
          actorRole: "admin",
          action: "user.set_role",
          resourceType: "users",
          resourceId: "u2",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          metadata: null,
          actor: { name: "Alice", email: "alice@example.com" },
        },
      ]),
    },
  };
}

describe("audit router — RBAC", () => {
  it("forbids roles without audit-log read", async () => {
    for (const role of ["member", "pending"]) {
      const caller = createCaller(makeCtx(fakeDb(), { role }));
      await expect(caller.audit.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("allows admin and auditor to read the log", async () => {
    for (const role of ["admin", "auditor"]) {
      const db = fakeDb();
      const caller = createCaller(makeCtx(db, { role }));
      const entries = await caller.audit.list();
      expect(entries).toHaveLength(1);
      expect(db.auditLog.findMany).toHaveBeenCalledOnce();
    }
  });

  it("applies the resourceType filter and limit", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { role: "auditor" }));
    await caller.audit.list({ limit: 10, resourceType: "users" });
    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceType: "users" },
        take: 10,
      }),
    );
  });
});
