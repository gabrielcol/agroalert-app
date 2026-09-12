import { z } from "zod";

import { cropIdSchema } from "@/lib/agro/crop-dictionary";

/**
 * Sowing Plan contract (CONTEXT.md "Sowing Plan", "Sowing Date"). A Plan
 * exists only from the moment the farmer confirms the Sowing Date (issue
 * 0008); the server stamps `sownAt` at that moment.
 */

export const markSownInputSchema = z.object({
  fieldProfileId: z.string().min(1),
  cropId: cropIdSchema,
  varietyName: z.string().trim().min(1).max(200).optional(),
});
export type MarkSownInput = z.infer<typeof markSownInputSchema>;

/**
 * A stored Sowing Plan as the API returns it. The database keeps `cropId` as
 * a plain string; parse rows through this schema so callers get the union.
 */
export const sowingPlanSchema = z.object({
  id: z.string(),
  fieldProfileId: z.string(),
  cropId: cropIdSchema,
  varietyName: z.string().nullable(),
  sownAt: z.date(),
  createdAt: z.date(),
});
export type SowingPlan = z.infer<typeof sowingPlanSchema>;

/** Upper bound on the ids one browser can ask for at once (and store). */
export const MAX_PLAN_IDS = 50;

export const sowingPlanIdsInputSchema = z.object({
  ids: z.array(z.string().min(1)).max(MAX_PLAN_IDS),
});
export type SowingPlanIdsInput = z.infer<typeof sowingPlanIdsInputSchema>;
