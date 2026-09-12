import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, type PermissionRequest } from "@/lib/permissions";

/**
 * Context is built once per request. Reads the better-auth session from the
 * incoming request headers so every procedure can see the signed-in user, and
 * captures the caller's IP / user-agent for audit entries.
 */
export const createTRPCContext = cache(async () => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return {
    db,
    session,
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent") ?? null,
  };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;
export type TRPCContext = Context;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Requires an authenticated user; narrows `ctx.session` to non-null. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Requires an authenticated user whose role grants the given permission.
 * Throws FORBIDDEN otherwise. Enforced server-side.
 */
export const permissionProcedure = (permission: PermissionRequest) =>
  protectedProcedure.use(({ ctx, next }) => {
    const role = (ctx.session.user as { role?: string | null }).role;
    if (!hasPermission(role, permission)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
