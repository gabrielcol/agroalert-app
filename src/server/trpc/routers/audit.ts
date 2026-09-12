import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "@/server/trpc/init";

/** Read-only view of the append-only audit trail (Admin + Auditor roles). */
export const auditRouter = createTRPCRouter({
  list: permissionProcedure({ "audit-log": ["read"] })
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          resourceType: z.string().min(1).optional(),
        })
        .default({ limit: 50 }),
    )
    .query(({ ctx, input }) =>
      ctx.db.auditLog.findMany({
        where: input.resourceType
          ? { resourceType: input.resourceType }
          : undefined,
        include: {
          actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      }),
    ),
});
