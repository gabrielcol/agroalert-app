import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import {
  markSownInputSchema,
  sowingPlanIdsInputSchema,
  sowingPlanSchema,
} from "@/lib/agro/sowing-plan";

/**
 * Sowing Plan — created the moment the farmer confirms the Sowing Date on
 * the plan summary (issue 0008). Public like the Field Profile router:
 * farmers have no account, ids are the only handle and this browser keeps
 * the ids of the plans it created.
 */
export const sowingPlanRouter = createTRPCRouter({
  markSown: publicProcedure
    .input(markSownInputSchema)
    .output(sowingPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.fieldProfile.findUnique({
        where: { id: input.fieldProfileId },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const row = await ctx.db.sowingPlan.create({
        data: {
          fieldProfileId: input.fieldProfileId,
          cropId: input.cropId,
          varietyName: input.varietyName ?? null,
          sownAt: new Date(),
        },
      });
      return sowingPlanSchema.parse(row);
    }),

  latestByProfile: publicProcedure
    .input(z.object({ fieldProfileId: z.string().min(1) }))
    .output(sowingPlanSchema.nullable())
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.sowingPlan.findFirst({
        where: { fieldProfileId: input.fieldProfileId },
        orderBy: { createdAt: "desc" },
      });
      return row ? sowingPlanSchema.parse(row) : null;
    }),

  byIds: publicProcedure
    .input(sowingPlanIdsInputSchema)
    .output(z.array(sowingPlanSchema))
    .query(async ({ ctx, input }) => {
      if (input.ids.length === 0) return [];
      const rows = await ctx.db.sowingPlan.findMany({
        where: { id: { in: input.ids } },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((row) => sowingPlanSchema.parse(row));
    }),
});
