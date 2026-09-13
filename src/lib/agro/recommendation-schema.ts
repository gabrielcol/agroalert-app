import { z } from "zod";

import { cropIdSchema } from "./crop-dictionary";
import { isoDateSchema, weatherBriefSchema } from "@/lib/weather/schema";

/**
 * Crop Recommendation and Variety Recommendation contracts (CONTEXT.md).
 * Frozen in issue 0003: the AI's structured output (issue 0006) is validated
 * against these before it is stored, and the cultura / soi screens read them.
 */

// The `.describe()` texts reach the model: `src/lib/ai/tools.ts` derives the
// tool JSON schema from these, and `description` is what the model reads
// (issue 0020). They do not change what validates.

export const fitSchema = z
  .number()
  .int()
  .min(0)
  .max(100)
  .describe("Whole number 0-100: how well the crop fits this parcel now.");
export const confidenceSchema = z
  .enum(["low", "medium", "high"])
  .describe("How well the data supports the call.");
export type Confidence = z.infer<typeof confidenceSchema>;

export const sowingWindowSchema = z
  .object({
    from: isoDateSchema.describe("ISO date YYYY-MM-DD."),
    to: isoDateSchema.describe("ISO date YYYY-MM-DD."),
  })
  .describe("The suggested sowing window for this parcel.");

export const recommendedCropSchema = z.object({
  /** a Crop id from the Crop Dictionary */
  cropId: cropIdSchema.describe("Exact crop id from the Crop Dictionary."),
  fit: fitSchema,
  /** Romanian, farmer-facing */
  reasons: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe(
      "2-3 Romanian sentences of at most 15 words each: why this crop fits here now.",
    ),
  /** Romanian, farmer-facing; may be empty */
  risks: z
    .array(z.string().min(1))
    .max(5)
    .describe(
      "1-2 Romanian sentences of at most 15 words each: what could go wrong.",
    ),
  sowingWindow: sowingWindowSchema,
  /** Variety names from the Crop Dictionary entry of this Crop */
  recommendedVarietyIds: z
    .array(z.string().min(1))
    .max(5)
    .describe(
      "0-5 variety names exactly as listed for this crop in the Crop Dictionary.",
    ),
  confidence: confidenceSchema,
});
export type RecommendedCrop = z.infer<typeof recommendedCropSchema>;

export const excludedCropSchema = z.object({
  cropId: cropIdSchema.describe("Exact crop id from the Crop Dictionary."),
  /** Romanian, one sentence */
  reason: z
    .string()
    .min(1)
    .describe("One Romanian sentence of at most 15 words."),
});

export const cropRecommendationSchema = z.object({
  /** ranked best first */
  top: z
    .array(recommendedCropSchema)
    .min(1)
    .max(3)
    .describe("1-3 candidate crops, best first."),
  excluded: z
    .array(excludedCropSchema)
    .describe(
      "Only the candidate crops left out of top, each with one reason. " +
        "Non-candidate crops are excluded automatically: do not list them.",
    ),
});
export type CropRecommendation = z.infer<typeof cropRecommendationSchema>;

export const rankedVarietySchema = z.object({
  varietyName: z
    .string()
    .min(1)
    .describe("Variety name exactly as listed in the Crop Dictionary."),
  fit: fitSchema,
  reasons: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe("1-3 Romanian sentences of at most 15 words each."),
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
