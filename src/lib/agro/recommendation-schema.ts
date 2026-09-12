import { z } from "zod";

import { cropIdSchema } from "./crop-dictionary";
import { isoDateSchema, weatherBriefSchema } from "@/lib/weather/schema";

/**
 * Crop Recommendation and Variety Recommendation contracts (CONTEXT.md).
 * Frozen in issue 0003: the AI's structured output (issue 0006) is validated
 * against these before it is stored, and the cultura / soi screens read them.
 */

export const fitSchema = z.number().int().min(0).max(100);
export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const sowingWindowSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const recommendedCropSchema = z.object({
  /** a Crop id from the Crop Dictionary */
  cropId: cropIdSchema,
  fit: fitSchema,
  /** Romanian, farmer-facing */
  reasons: z.array(z.string().min(1)).min(1).max(5),
  /** Romanian, farmer-facing; may be empty */
  risks: z.array(z.string().min(1)).max(5),
  sowingWindow: sowingWindowSchema,
  /** Variety names from the Crop Dictionary entry of this Crop */
  recommendedVarietyIds: z.array(z.string().min(1)).max(5),
  confidence: confidenceSchema,
});
export type RecommendedCrop = z.infer<typeof recommendedCropSchema>;

export const excludedCropSchema = z.object({
  cropId: cropIdSchema,
  /** Romanian, one sentence */
  reason: z.string().min(1),
});

export const cropRecommendationSchema = z.object({
  /** ranked best first */
  top: z.array(recommendedCropSchema).min(1).max(3),
  excluded: z.array(excludedCropSchema),
});
export type CropRecommendation = z.infer<typeof cropRecommendationSchema>;

export const rankedVarietySchema = z.object({
  varietyName: z.string().min(1),
  fit: fitSchema,
  reasons: z.array(z.string().min(1)).min(1).max(5),
});

export const varietyRecommendationSchema = z.object({
  cropId: cropIdSchema,
  /** every Variety of the Crop in the Crop Dictionary, ranked best first */
  ranked: z.array(rankedVarietySchema),
});
export type VarietyRecommendation = z.infer<typeof varietyRecommendationSchema>;

// ---------------------------------------------------------------------------
// Stored records as the API returns them
// ---------------------------------------------------------------------------

export const cropRecommendationRecordSchema = z.object({
  id: z.string(),
  fieldProfileId: z.string(),
  weatherBrief: weatherBriefSchema,
  result: cropRecommendationSchema,
  modelId: z.string(),
  createdAt: z.date(),
});
export type CropRecommendationRecord = z.infer<
  typeof cropRecommendationRecordSchema
>;

export const varietyRecommendationRecordSchema = z.object({
  id: z.string(),
  cropRecommendationId: z.string(),
  cropId: cropIdSchema,
  result: varietyRecommendationSchema,
  modelId: z.string(),
  createdAt: z.date(),
});
export type VarietyRecommendationRecord = z.infer<
  typeof varietyRecommendationRecordSchema
>;
