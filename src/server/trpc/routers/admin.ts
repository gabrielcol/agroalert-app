import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";

import { createTRPCRouter, permissionProcedure } from "@/server/trpc/init";
import { auth } from "@/lib/auth";
import { ROLE_NAMES, type AppRole } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const roleEnum = z.enum(ROLE_NAMES as [AppRole, ...AppRole[]]);

/** tRPC error codes we can safely mirror from a better-auth API failure. */
const AUTH_STATUS_TO_TRPC: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
};

/**
 * Map a better-auth admin-API failure to a tRPC error. These endpoints manage
 * users (create/update/password/ban) outside our DB transaction, so — unlike
 * the atomic domain writes — the audit row is written best-effort *after* a
 * successful call (mirroring the best-effort auth-event logging).
 * Preserve the failure's status (e.g. NOT_FOUND / UNAUTHORIZED) when the
 * better-auth `APIError` carries one; fall back to BAD_REQUEST otherwise.
 */
function authApiError(e: unknown, fallback: string): TRPCError {
  const message = e instanceof Error ? e.message : fallback;
  const status = (e as { status?: unknown })?.status;
  const code =
    typeof status === "string" ? AUTH_STATUS_TO_TRPC[status] : undefined;
  return new TRPCError({ code: code ?? "BAD_REQUEST", message });
}

/**
 * Write an audit row best-effort: a failure here must not fail an already-
 * committed user mutation (create/update/password/ban happen in the better-auth
 * API, outside our DB), which would mislead the admin into retrying a change
 * that actually took effect. The failure is logged for follow-up instead.
 */
async function writeAuditLogBestEffort(
  ...args: Parameters<typeof writeAuditLog>
): Promise<void> {
  try {
    await writeAuditLog(...args);
  } catch (e) {
    console.error("Best-effort audit log write failed", e);
  }
}

/** User & role management. Guarded by the admin-plugin `user` permissions. */
export const adminRouter = createTRPCRouter({
  listUsers: permissionProcedure({ user: ["list"] }).query(({ ctx }) =>
    ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  setRole: permissionProcedure({ user: ["set-role"] })
    .input(z.object({ userId: z.string().min(1), role: roleEnum }))
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      // Update + audit run in one transaction: if the audit write fails, the
      // role change rolls back too (fail-closed — no un-audited mutation).
      return ctx.db.$transaction(async (tx) => {
        const previous = await tx.user.findUnique({
          where: { id: input.userId },
          select: { role: true },
        });
        if (!previous) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        const user = await tx.user.update({
          where: { id: input.userId },
          data: { role: input.role },
          select: { id: true, name: true, email: true, role: true },
        });

        await writeAuditLog(tx, {
          actorId: ctx.session.user.id,
          actorRole,
          action: "user.set_role",
          resourceType: "users",
          resourceId: input.userId,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          metadata: { from: previous.role, to: input.role },
        });

        return user;
      });
    }),

  /**
   * Create a user with an admin-set initial password. There is no e-mail
   * invite (no mail server is assumed) — the admin sets the password and
   * shares it out of band. Delegates to the better-auth admin API
   * (password hashing + account row), then audits best-effort.
   */
  createUser: permissionProcedure({ user: ["create"] })
    .input(
      z.object({
        name: z.string().min(1).max(120),
        email: z.email(),
        password: z.string().min(8).max(128),
        role: roleEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      let created: Awaited<ReturnType<typeof auth.api.createUser>>;
      try {
        created = await auth.api.createUser({
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            role: input.role,
          },
          headers: await headers(),
        });
      } catch (e) {
        // Most common cause: the e-mail is already registered.
        throw new TRPCError({
          code: "CONFLICT",
          message: e instanceof Error ? e.message : "Could not create user",
        });
      }

      await writeAuditLogBestEffort(ctx.db, {
        actorId: ctx.session.user.id,
        actorRole,
        action: "user.create",
        resourceType: "users",
        resourceId: created.user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { email: input.email, role: input.role },
      });

      return {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        role: created.user.role ?? input.role,
      };
    }),

  /** Edit a user's display name. */
  updateUser: permissionProcedure({ user: ["update"] })
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(1).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      try {
        await auth.api.adminUpdateUser({
          body: { userId: input.userId, data: { name: input.name } },
          headers: await headers(),
        });
      } catch (e) {
        throw authApiError(e, "Could not update user");
      }

      await writeAuditLogBestEffort(ctx.db, {
        actorId: ctx.session.user.id,
        actorRole,
        action: "user.update",
        resourceType: "users",
        resourceId: input.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { name: input.name },
      });

      return { id: input.userId, name: input.name };
    }),

  /** Reset a user's password to an admin-set value. */
  setPassword: permissionProcedure({ user: ["set-password"] })
    .input(
      z.object({
        userId: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      try {
        await auth.api.setUserPassword({
          body: { userId: input.userId, newPassword: input.newPassword },
          headers: await headers(),
        });
      } catch (e) {
        throw authApiError(e, "Could not reset password");
      }

      // Never record the password itself — just that a reset happened.
      await writeAuditLogBestEffort(ctx.db, {
        actorId: ctx.session.user.id,
        actorRole,
        action: "user.set_password",
        resourceType: "users",
        resourceId: input.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: {},
      });

      return { id: input.userId };
    }),

  /**
   * Deactivate (ban) or reactivate (unban) a user. "Delete" in the UI
   * is a reversible deactivation — the row is kept so the user stays attributable
   * in the audit trail. An admin cannot deactivate their own account (lockout
   * guard).
   */
  setBanned: permissionProcedure({ user: ["ban"] })
    .input(
      z.object({
        userId: z.string().min(1),
        banned: z.boolean(),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      if (input.banned && input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      try {
        if (input.banned) {
          await auth.api.banUser({
            body: { userId: input.userId, banReason: input.reason },
            headers: await headers(),
          });
        } else {
          await auth.api.unbanUser({
            body: { userId: input.userId },
            headers: await headers(),
          });
        }
      } catch (e) {
        throw authApiError(e, "Could not update user status");
      }

      await writeAuditLogBestEffort(ctx.db, {
        actorId: ctx.session.user.id,
        actorRole,
        action: input.banned ? "user.deactivate" : "user.reactivate",
        resourceType: "users",
        resourceId: input.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { reason: input.reason ?? null },
      });

      return { id: input.userId, banned: input.banned };
    }),
});
