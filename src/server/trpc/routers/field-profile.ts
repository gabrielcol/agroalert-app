import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import {
  fieldProfileInputSchema,
  fieldProfileSchema,
} from "@/lib/agro/field-profile";

/**
 * Field Profile — the anonymous record the teren step creates (issue 0004)
 * and the rest of the wizard reads by id from the URL. Public on purpose:
 * farmers have no account (see STATUS.md, auth story undecided); the cuid id
 * is the only handle.
 */
export const fieldProfileRouter = createTRPCRouter({
  create: publicProcedure
    .input(fieldProfileInputSchema)
    .output(fieldProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.fieldProfile.create({ data: input });
      return fieldProfileSchema.parse(row);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .output(fieldProfileSchema)
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.fieldProfile.findUnique({
        where: { id: input.id },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      return fieldProfileSchema.parse(profile);
    }),
});
