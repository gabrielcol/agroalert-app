// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { makeCtx } from "../../../../test/trpc";

function fakeDb() {
  const db = {
    user: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          role: "auditor",
          banned: false,
          createdAt: new Date(),
        },
      ]),
      findUnique: vi.fn().mockResolvedValue({ role: "auditor" }),
      update: vi.fn().mockImplementation(({ where, data }) => ({
        id: where.id,
        name: "Alice",
        email: "alice@example.com",
        role: data.role,
      })),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    // Interactive transaction: run the callback against this same fake client.
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return db;
}

describe("admin router — RBAC", () => {
  it("blocks unauthenticated callers", async () => {
    const caller = createCaller(makeCtx(fakeDb(), null));
    await expect(caller.admin.listUsers()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("forbids non-admin roles from listing users", async () => {
    for (const role of ["auditor", "member", "pending"]) {
      const caller = createCaller(makeCtx(fakeDb(), { role }));
      await expect(caller.admin.listUsers()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("lets an admin list users", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { role: "admin" }));
    const users = await caller.admin.listUsers();
    expect(users).toHaveLength(1);
    expect(db.user.findMany).toHaveBeenCalledOnce();
  });

  it("forbids non-admins from changing roles", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { role: "member" }));
    await expect(
      caller.admin.setRole({ userId: "u1", role: "admin" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("lets an admin set a role and writes an audit entry", async () => {
    const db = fakeDb();
    const caller = createCaller(makeCtx(db, { id: "admin1", role: "admin" }));
    const updated = await caller.admin.setRole({
      userId: "u1",
      role: "member",
    });

    expect(updated.role).toBe("member");
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { role: "member" },
      select: { id: true, name: true, email: true, role: true },
    });

    expect(db.auditLog.create).toHaveBeenCalledOnce();
    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      actorId: "admin1",
      actorRole: "admin",
      action: "user.set_role",
      resourceType: "users",
      resourceId: "u1",
    });
    expect(data.metadata).toBe('{"from":"auditor","to":"member"}');
  });

  it("rejects an invalid role value", async () => {
    const caller = createCaller(makeCtx(fakeDb(), { role: "admin" }));
    await expect(
      // @ts-expect-error — exercising runtime validation with a bad role
      caller.admin.setRole({ userId: "u1", role: "superuser" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns NOT_FOUND when the target user does not exist", async () => {
    const db = fakeDb();
    db.user.findUnique.mockResolvedValueOnce(null);
    const caller = createCaller(makeCtx(db, { role: "admin" }));
    await expect(
      caller.admin.setRole({ userId: "ghost", role: "member" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

// The create/update/set-password/ban procedures delegate to the better-auth
// admin API (which needs a real request/session), so unit coverage asserts the
// RBAC + input guards that run *before* any auth-API call; the happy paths are
// covered by e2e.
describe("admin router — user management guards", () => {
  const nonAdmins = ["member", "auditor", "pending"];

  it("forbids non-admins from creating users", async () => {
    for (const role of nonAdmins) {
      const caller = createCaller(makeCtx(fakeDb(), { role }));
      await expect(
        caller.admin.createUser({
          name: "New",
          email: "new@example.com",
          password: "password123",
          role: "member",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("forbids non-admins from editing, resetting passwords, or banning", async () => {
    const caller = createCaller(makeCtx(fakeDb(), { role: "member" }));
    await expect(
      caller.admin.updateUser({ userId: "u1", name: "X" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.setPassword({ userId: "u1", newPassword: "password123" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.setBanned({ userId: "u1", banned: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a too-short initial password before hitting the auth API", async () => {
    const caller = createCaller(makeCtx(fakeDb(), { role: "admin" }));
    await expect(
      caller.admin.createUser({
        name: "New",
        email: "new@example.com",
        password: "short",
        role: "member",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks an admin from deactivating their own account", async () => {
    const caller = createCaller(
      makeCtx(fakeDb(), { id: "admin1", role: "admin" }),
    );
    await expect(
      caller.admin.setBanned({ userId: "admin1", banned: true }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
