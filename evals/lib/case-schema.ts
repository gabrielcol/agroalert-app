import { z } from "zod";

import { fieldProfileSchema } from "@/lib/agro/field-profile";
import { confidenceSchema } from "@/lib/agro/recommendation-schema";
import { isoDateSchema, weatherBriefSchema } from "@/lib/weather/schema";

/**
 * The shapes of the two file kinds under `evals/` — a case and a frozen Weather
 * Brief — as `evals/README.md` § "Case schema" spells them out.
 *
 * Objects are strict, so a typo'd key fails loudly instead of being silently
 * ignored: a constraint nobody reads is worse than no constraint.
 *
 * Crop ids and variety names are plain strings here on purpose. They *must* be
 * dictionary ids, but `staticIssues` (evals/lib/static-checks.ts) is what says
 * so, in a sentence naming the offending value; parsing them with
 * `cropIdSchema` would turn the same mistake into a Zod error thrown while the
 * dataset loads, before any check can report it.
 */

/** A crop id as a case writes it; validated against the dictionary later. */
const cropIdRefSchema = z.string().min(1);
/** A variety name as a case writes it; validated against the crop later. */
const varietyNameRefSchema = z.string().min(1);

export const EVAL_KINDS = ["crops", "varieties"] as const;
export const evalKindSchema = z.enum(EVAL_KINDS);
export type EvalKind = z.infer<typeof evalKindSchema>;

export const EVAL_CATEGORIES = ["grid", "date", "stress"] as const;
export const evalCategorySchema = z.enum(EVAL_CATEGORIES);
export type EvalCategory = z.infer<typeof evalCategorySchema>;

/**
 * The `expect` vocabulary. Every key is optional — a case may assert nothing
 * and still be meaningful, because the invariants apply everywhere — and
 * `fitOrder` / `varietyOrder` pairs are conditional: they bite only when both
 * members are present in the answer.
 */
export const evalExpectSchema = z
  .object({
    /** Crop ids that must appear in `top` (crops cases). */
    mustInclude: z.array(cropIdRefSchema).optional(),
    /** Crop ids that must not appear in `top` (crops cases). */
    mustExclude: z.array(cropIdRefSchema).optional(),
    /** Pairs `[a, b]`: if both are in `top`, `fit(a) > fit(b)`. */
    fitOrder: z.array(z.tuple([cropIdRefSchema, cropIdRefSchema])).optional(),
    /** No `top` crop may exceed this confidence. */
    maxConfidence: confidenceSchema.optional(),
    /** Varieties cases: at least one of these must rank first. */
    topAny: z.array(varietyNameRefSchema).optional(),
    /** Varieties cases: pairs `[a, b]` with `fit(a) > fit(b)`. */
    varietyOrder: z
      .array(z.tuple([varietyNameRefSchema, varietyNameRefSchema]))
      .optional(),
  })
  .strict();
export type EvalExpect = z.infer<typeof evalExpectSchema>;

/** Crops-only `expect` keys, and the varieties-only ones. */
const CROPS_ONLY_EXPECT_KEYS = [
  "mustInclude",
  "mustExclude",
  "fitOrder",
] as const;
const VARIETIES_ONLY_EXPECT_KEYS = ["topAny", "varietyOrder"] as const;

/**
 * A Field Profile as a case carries it: everything the teren step collects,
 * without the stored-record fields (`id`, `createdAt`) that a case has no
 * business inventing. The runner composes those.
 */
export const evalProfileSchema = fieldProfileSchema
  .omit({ id: true, createdAt: true })
  .strict();
export type EvalProfile = z.infer<typeof evalProfileSchema>;

export const evalCaseSchema = z
  .object({
    /** Equals the file name without `.json`; `staticIssues` checks it. */
    id: z.string().min(1),
    kind: evalKindSchema,
    category: evalCategorySchema,
    title: z.string().trim().min(1),
    /** Slug of the brief file under `evals/briefs/`. */
    brief: z.string().min(1),
    /** Must equal `brief.today`; `staticIssues` checks it. */
    today: isoDateSchema,
    /** True exactly when `profile.soilClass` is `unknown`. */
    lowData: z.boolean(),
    profile: evalProfileSchema,
    /** Varieties cases only: the crop whose varieties are ranked. */
    cropId: cropIdRefSchema.optional(),
    expect: evalExpectSchema.optional(),
    rationale: z.string().trim().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    // The kind decides which keys may appear at all: a `topAny` on a crops
    // case, or a `mustInclude` on a varieties case, is not a weak constraint
    // but an unread one.
    if (value.kind === "crops") {
      if (value.cropId !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["cropId"],
          message: "a crops case must not carry cropId",
        });
      }
      for (const key of VARIETIES_ONLY_EXPECT_KEYS) {
        if (value.expect?.[key] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["expect", key],
            message: `a crops case must not carry expect.${key}`,
          });
        }
      }
      return;
    }
    if (value.cropId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["cropId"],
        message: "a varieties case must carry cropId",
      });
    }
    for (const key of CROPS_ONLY_EXPECT_KEYS) {
      if (value.expect?.[key] !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["expect", key],
          message: `a varieties case must not carry expect.${key}`,
        });
      }
    }
  });
export type EvalCase = z.infer<typeof evalCaseSchema>;

/**
 * A brief file: the frozen Weather Brief plus the provenance `scripts/
 * capture-eval-briefs.ts` writes around it. Loose on the metadata (a capture
 * script may add a field), strict where it matters — `brief` is the frozen
 * contract the model is shown.
 */
export const briefFileSchema = z.object({
  kind: z.enum(["captured", "synthetic"]),
  /** Equals the file name without `.json`, and is what a case references. */
  slug: z.string().min(1),
  name: z.string().min(1),
  county: z.string().optional(),
  zone: z.string().optional(),
  /** Captured briefs carry `capturedAt`, synthetic ones `generatedAt`. */
  capturedAt: z.string().optional(),
  generatedAt: z.string().optional(),
  source: z.string().min(1),
  /** Mandatory on a synthetic brief: what was derived, and what is unusable. */
  notes: z.string().optional(),
  brief: weatherBriefSchema,
});
export type BriefFile = z.infer<typeof briefFileSchema>;
