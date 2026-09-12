import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { env } from "@/env";
import { cropIdSchema } from "@/lib/agro/crop-dictionary";
import {
  cropRecommendationFixture,
  varietyRecommendationFixture,
} from "@/lib/agro/recommendation-fixture";
import {
  cropRecommendationRecordSchema,
  varietyRecommendationRecordSchema,
} from "@/lib/agro/recommendation-schema";
import { weatherBriefFixture } from "@/lib/weather/fixture";

export const cropsInput = z.object({ fieldProfileId: z.string().min(1) });
export const varietiesInput = z.object({
  cropRecommendationId: z.string().min(1),
  cropId: cropIdSchema,
});

const STUB_ID_PREFIX = "stub_";

/**
 * Crop Recommendation and Variety Recommendation for a Field Profile. Issue
 * 0006 replaces the bodies with the Claude call and persists the rows; the
 * contracts (`cropRecommendationRecordSchema`, `varietyRecommendationRecordSchema`)
 * stay. Until then fixtures, not persisted, with `stub_` ids.
 */
export const recommendationRouter = createTRPCRouter({
  crops: publicProcedure
    .input(cropsInput)
    .output(cropRecommendationRecordSchema)
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.fieldProfile.findUnique({
        where: { id: input.fieldProfileId },
        select: { id: true, lat: true, lng: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const brief = weatherBriefFixture();
      return {
        id: `${STUB_ID_PREFIX}${profile.id}`,
        fieldProfileId: profile.id,
        weatherBrief: {
          ...brief,
          location: { lat: profile.lat, lng: profile.lng },
        },
        result: cropRecommendationFixture,
        modelId: env.AI_MODEL,
        createdAt: new Date(),
      };
    }),

  varieties: publicProcedure
    .input(varietiesInput)
    .output(varietyRecommendationRecordSchema)
    .query(async ({ input }) => {
      return {
        id: `${STUB_ID_PREFIX}${input.cropRecommendationId}_${input.cropId}`,
        cropRecommendationId: input.cropRecommendationId,
        cropId: input.cropId,
        result: { ...varietyRecommendationFixture, cropId: input.cropId },
        modelId: env.AI_MODEL,
        createdAt: new Date(),
      };
    }),
});
