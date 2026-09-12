// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// recordAuthEvent uses the db singleton at import time; stub it so no real
// SQLite connection is opened during unit tests.
vi.mock("@/lib/db", () => ({ db: { user: {}, auditLog: {} } }));

import { diffChanges, writeAuditLog } from "@/lib/audit";

function fakeDb() {
  return { auditLog: { create: vi.fn().mockResolvedValue({}) } };
}

afterEach(() => vi.restoreAllMocks());

describe("writeAuditLog", () => {
  it("persists an entry and JSON-serializes metadata", async () => {
    const db = fakeDb();
    await writeAuditLog(db, {
      actorId: "u1",
      actorRole: "admin",
      action: "user.set_role",
      resourceType: "users",
      resourceId: "u2",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      metadata: { from: "auditor", to: "admin" },
    });

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      actorId: "u1",
      actorRole: "admin",
      action: "user.set_role",
      resourceType: "users",
      resourceId: "u2",
    });
    expect(data.metadata).toBe('{"from":"auditor","to":"admin"}');
  });

  it("stores null metadata when none is provided", async () => {
    const db = fakeDb();
    await writeAuditLog(db, { action: "auth.sign_in", resourceType: "auth" });
    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data.metadata).toBeNull();
    expect(data.actorId).toBeNull();
  });

  it("propagates write failures so callers can fail closed", async () => {
    const db = {
      auditLog: { create: vi.fn().mockRejectedValue(new Error("db down")) },
    };
    await expect(
      writeAuditLog(db, { action: "x", resourceType: "y" }),
    ).rejects.toThrow("db down");
  });
});

describe("diffChanges", () => {
  it("records only fields whose value actually changed", () => {
    const changes = diffChanges(
      { company: "Old Co", host: "Maria", phone: "123" },
      { company: "New Co", host: "Maria", phone: "123" },
    );
    expect(changes).toEqual({
      company: { from: "Old Co", to: "New Co" },
    });
  });

  it("only considers keys present in `after` (the changed columns)", () => {
    // `before` may carry extra selected columns (e.g. id) — they're ignored
    // unless the same key appears in `after`.
    const changes = diffChanges(
      { id: "v1", company: "Old Co" },
      { company: "New Co" },
    );
    expect(Object.keys(changes)).toEqual(["company"]);
  });

  it("normalizes Dates to ISO strings on both sides", () => {
    const changes = diffChanges(
      { endsAt: new Date("2026-01-01T00:00:00Z") },
      { endsAt: new Date("2026-01-02T00:00:00Z") },
    );
    expect(changes.endsAt).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-02T00:00:00.000Z",
    });
  });

  it("treats equal Dates as unchanged", () => {
    const changes = diffChanges(
      { startsAt: new Date("2026-01-01T00:00:00Z") },
      { startsAt: new Date("2026-01-01T00:00:00Z") },
    );
    expect(changes).toEqual({});
  });

  it("captures null/empty transitions and booleans", () => {
    const changes = diffChanges(
      { code: null, active: true },
      { code: "X-0001", active: false },
    );
    expect(changes).toEqual({
      code: { from: null, to: "X-0001" },
      active: { from: true, to: false },
    });
  });

  it("caps long string values so the serialized diff stays bounded", () => {
    const before = "a".repeat(10);
    const after = "b".repeat(1000);
    const changes = diffChanges({ body: before }, { body: after });
    const stored = changes.body.to as string;
    expect(stored.length).toBe(501); // 500 chars + the ellipsis marker
    expect(stored.endsWith("…")).toBe(true);
  });

  it("still detects a change that differs only past the cap", () => {
    const before = "x".repeat(600);
    const after = "x".repeat(500) + "y".repeat(100);
    const changes = diffChanges({ body: before }, { body: after });
    expect(changes.body).toBeDefined();
  });
});
