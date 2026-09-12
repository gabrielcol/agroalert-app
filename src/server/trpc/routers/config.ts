import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "@/server/trpc/init";
import { diffChanges, writeAuditLog } from "@/lib/audit";
import { LOCALES } from "@/lib/i18n";

const SYSTEM_CONFIG_ID = "singleton";

/** Update payload for the singleton system configuration. */
export const systemConfigInput = z.object({
  defaultLocale: z.enum(LOCALES),
  siteName: z.string().max(200).default(""),
});
export type SystemConfigInput = z.infer<typeof systemConfigInput>;

/**
 * System configuration: default locale + site name. `getSystem` reads the
 * singleton; `updateSystem` edits it, running the write + its audit row in one
 * transaction (fail-closed).
 */
export const configRouter = createTRPCRouter({
  /**
   * Read the singleton system config. Falls back to the schema defaults when the
   * row is missing (e.g. an unseeded DB) instead of throwing a raw Prisma error,
   * so the settings screen always has sensible values to render.
   */
  getSystem: permissionProcedure({ "system-config": ["read"] }).query(
    async ({ ctx }) => {
      const config = await ctx.db.systemConfig.findUnique({
        where: { id: SYSTEM_CONFIG_ID },
      });
      return (
        config ?? {
          id: SYSTEM_CONFIG_ID,
          defaultLocale: "ro" as const,
          siteName: "",
          updatedAt: new Date(0),
        }
      );
    },
  ),

  /** Update the singleton system config (atomic audit). */
  updateSystem: permissionProcedure({ "system-config": ["update"] })
    .input(systemConfigInput)
    .mutation(async ({ ctx, input }) => {
      const actorRole =
        (ctx.session.user as { role?: string | null }).role ?? null;

      return ctx.db.$transaction(async (tx) => {
        const previous = await tx.systemConfig.findUnique({
          where: { id: SYSTEM_CONFIG_ID },
          select: { defaultLocale: true, siteName: true },
        });

        const config = await tx.systemConfig.upsert({
          where: { id: SYSTEM_CONFIG_ID },
          create: { id: SYSTEM_CONFIG_ID, ...input },
          update: { ...input },
        });

        await writeAuditLog(tx, {
          actorId: ctx.session.user.id,
          actorRole,
          action: "system.update_config",
          resourceType: "system-config",
          resourceId: config.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          metadata: { changes: diffChanges(previous ?? {}, input) },
        });

        return config;
      });
    }),
});
