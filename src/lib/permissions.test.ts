import { describe, expect, it } from "vitest";

import {
  SIGNUP_ROLE,
  ROLE_NAMES,
  canAccessAdminArea,
  hasPermission,
  isAppRole,
} from "@/lib/permissions";

describe("permissions", () => {
  it("exposes the three app roles and a non-privileged sign-up role", () => {
    expect([...ROLE_NAMES].sort()).toEqual(["admin", "auditor", "member"]);
    expect(SIGNUP_ROLE).toBe("pending");
    expect(isAppRole(SIGNUP_ROLE)).toBe(false);
  });

  it("admin can do everything", () => {
    expect(hasPermission("admin", { "audit-log": ["read"] })).toBe(true);
    expect(hasPermission("admin", { user: ["set-role"] })).toBe(true);
    expect(hasPermission("admin", { "system-config": ["update"] })).toBe(true);
  });

  it("auditor is read-only", () => {
    expect(hasPermission("auditor", { "audit-log": ["read"] })).toBe(true);
    expect(hasPermission("auditor", { "system-config": ["read"] })).toBe(true);
    expect(hasPermission("auditor", { "system-config": ["update"] })).toBe(
      false,
    );
    expect(hasPermission("auditor", { user: ["list"] })).toBe(false);
  });

  it("member has no admin capabilities", () => {
    expect(hasPermission("member", { "system-config": ["read"] })).toBe(true);
    expect(hasPermission("member", { "system-config": ["update"] })).toBe(
      false,
    );
    expect(hasPermission("member", { "audit-log": ["read"] })).toBe(false);
    expect(hasPermission("member", { user: ["list"] })).toBe(false);
  });

  it("unknown, empty and pending roles grant nothing (default-deny)", () => {
    for (const role of [null, undefined, "", "pending", "superuser"]) {
      expect(hasPermission(role, { "system-config": ["read"] })).toBe(false);
      expect(canAccessAdminArea(role)).toBe(false);
    }
  });

  it("supports comma-separated role lists", () => {
    expect(hasPermission("member,auditor", { "audit-log": ["read"] })).toBe(
      true,
    );
    expect(hasPermission("pending,member", { user: ["list"] })).toBe(false);
  });

  it("canAccessAdminArea reflects user-management or audit access", () => {
    expect(canAccessAdminArea("admin")).toBe(true);
    expect(canAccessAdminArea("auditor")).toBe(true);
    expect(canAccessAdminArea("member")).toBe(false);
  });
});
