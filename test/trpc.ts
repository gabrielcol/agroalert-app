import type { TRPCContext } from "@/server/trpc/init";

type TestUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string | null;
};

/** Build a fake better-auth session for a given user (or null = signed out). */
export function makeSession(user: TestUser | null) {
  if (!user) return null;
  return {
    user: { id: "u1", name: "Test", email: "test@example.com", ...user },
    session: { id: "s1" },
  };
}

/**
 * Build a tRPC context for router tests. `db` is a fake Prisma client and
 * `user` seeds the session (pass a `role` to exercise RBAC).
 */
export function makeCtx(
  db: unknown,
  user: TestUser | null = null,
): TRPCContext {
  return {
    db: db as TRPCContext["db"],
    session: makeSession(user) as TRPCContext["session"],
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
  };
}
