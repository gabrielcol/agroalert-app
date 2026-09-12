import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import type { Prisma } from "@/generated/prisma/client";
import {
  AiOutputError,
  MissingApiKeyError,
  WeatherUnavailableError,
} from "@/lib/ai/errors";
import { getRecommendationService } from "@/lib/ai/service";
import { cropIdSchema } from "@/lib/agro/crop-dictionary";
import { fieldProfileSchema } from "@/lib/agro/field-profile";
import {
  cropRecommendationRecordSchema,
  varietyRecommendationRecordSchema,
} from "@/lib/agro/recommendation-schema";
import { weatherBriefSchema } from "@/lib/weather/schema";

export const cropsInput = z.object({ fieldProfileId: z.string().min(1) });
export const varietiesInput = z.object({
  cropRecommendationId: z.string().min(1),
  cropId: cropIdSchema,
});

/** Stable error messages the screens can key their copy on. */
export const RECOMMENDATION_ERRORS = {
  weather: "WEATHER_UNAVAILABLE",
  ai: "AI_UNAVAILABLE",
  output: "AI_INVALID_OUTPUT",
} as const;

function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof WeatherUnavailableError) {
    return new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: RECOMMENDATION_ERRORS.weather,
      cause: error,
    });
  }
  if (error instanceof AiOutputError) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: RECOMMENDATION_ERRORS.output,
      cause: error,
    });
  }
  if (
    error instanceof MissingApiKeyError ||
    error instanceof Anthropic.APIError
  ) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: RECOMMENDATION_ERRORS.ai,
      cause: error,
    });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Crop Recommendation and Variety Recommendation for a Field Profile. Both
 * procedures are idempotent: a stored row is returned as-is, so a refresh
 * never re-runs the model. Errors map to a retry screen; no partial output.
 */
export const recommendationRouter = createTRPCRouter({
  crops: publicProcedure
    .input(cropsInput)
    .output(cropRecommendationRecordSchema)
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.cropRecommendation.findFirst({
        where: { fieldProfileId: input.fieldProfileId },
        orderBy: { createdAt: "desc" },
      });
      if (existing) return cropRecommendationRecordSchema.parse(existing);

      const row = await ctx.db.fieldProfile.findUnique({
        where: { id: input.fieldProfileId },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const profile = fieldProfileSchema.parse(row);

      try {
        const { brief, result, modelId } =
          await getRecommendationService().crops(profile);
        const created = await ctx.db.cropRecommendation.create({
          data: {
            fieldProfileId: profile.id,
            weatherBrief: asJson(brief),
            result: asJson(result),
            modelId,
          },
        });
        return cropRecommendationRecordSchema.parse(created);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  varieties: publicProcedure
    .input(varietiesInput)
    .output(varietyRecommendationRecordSchema)
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.varietyRecommendation.findFirst({
        where: {
          cropRecommendationId: input.cropRecommendationId,
          cropId: input.cropId,
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) return varietyRecommendationRecordSchema.parse(existing);

      const recommendation = await ctx.db.cropRecommendation.findUnique({
        where: { id: input.cropRecommendationId },
        include: { fieldProfile: true },
      });
      if (!recommendation) throw new TRPCError({ code: "NOT_FOUND" });
      const profile = fieldProfileSchema.parse(recommendation.fieldProfile);
      const brief = weatherBriefSchema.parse(recommendation.weatherBrief);

      try {
        const { result, modelId } = await getRecommendationService().varieties({
          profile,
          brief,
          cropId: input.cropId,
        });
        const created = await ctx.db.varietyRecommendation.create({
          data: {
            cropRecommendationId: recommendation.id,
            cropId: input.cropId,
            result: asJson(result),
            modelId,
          },
        });
        return varietyRecommendationRecordSchema.parse(created);
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
