import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  cropRecommendationSchema,
  varietyRecommendationSchema,
} from "@/lib/agro/recommendation-schema";

/**
 * Structured output via tool use: each recommendation is the input of a tool
 * whose JSON schema is derived from the frozen Zod contract. The model is
 * forced to call the tool; the tool input is then normalised (issue 0020) and
 * re-validated with the same Zod schema (`parseToolInput`) before anything is
 * stored.
 */

export const CROP_TOOL_NAME = "recommend_crops" as const;
export const VARIETY_TOOL_NAME = "rank_varieties" as const;

/**
 * Strict tool use lets the API enforce the schema while the model writes the
 * arguments (Haiku 4.5 supports it), but strict schemas accept only a subset
 * of JSON Schema: no numeric / string-length / array-length bounds, no
 * `pattern`, and `additionalProperties: false` on every object. The bounds
 * are still enforced client-side by Zod (after normalisation), and the ISO
 * date pattern becomes the supported `format: "date"`.
 */
const UNSUPPORTED_IN_STRICT = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "uniqueItems",
]);

function toStrictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictSchema);
  if (node === null || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (UNSUPPORTED_IN_STRICT.has(key)) continue;
    if (key === "pattern") {
      if (typeof value === "string" && value.includes("\\d{4}-\\d{2}-\\d{2}")) {
        out.format = "date";
      }
      continue;
    }
    out[key] =
      key === "properties" && value !== null && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
              k,
              toStrictSchema(v),
            ]),
          )
        : toStrictSchema(value);
  }
  if (out.type === "object") out.additionalProperties = false;
  return out;
}

function inputSchemaFor(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input" });
  // The API wants a bare object schema, without the `$schema` marker.
  const { $schema: _ignored, ...rest } = json as Record<string, unknown>;
  void _ignored;
  return toStrictSchema(rest) as Anthropic.Tool.InputSchema;
}

export const cropRecommendationTool: Anthropic.Tool = {
  name: CROP_TOOL_NAME,
  description:
    "Record the Crop Recommendation for the farmer's parcel: the top 1-3 " +
    "candidate crops (best first) with an integer fit 0-100, short Romanian " +
    "reasons and risks, the suggested sowing window, recommended variety names " +
    "and a confidence. Under `excluded`, list ONLY the candidate crops you leave " +
    "out of the top list, one short Romanian reason each. Every non-candidate " +
    "crop is excluded automatically and must not be listed.",
  input_schema: inputSchemaFor(cropRecommendationSchema),
  strict: true,
};

export const varietyRecommendationTool: Anthropic.Tool = {
  name: VARIETY_TOOL_NAME,
  description:
    "Record the Variety Recommendation for one crop: every variety listed for " +
    "that crop in the Crop Dictionary, ranked best first with an integer fit " +
    "0-100 and short Romanian reasons.",
  input_schema: inputSchemaFor(varietyRecommendationSchema),
  strict: true,
};

/** Both calls send the same tool list so the cached prefix is shared. */
export const RECOMMENDATION_TOOLS: Anthropic.Tool[] = [
  cropRecommendationTool,
  varietyRecommendationTool,
];

// ---------------------------------------------------------------------------
// Normalisation: the forgiving step before Zod (issue 0020)
// ---------------------------------------------------------------------------

/** The contract's bounds, applied by trimming rather than by rejecting. */
const MAX_LIST = 5;
const MAX_TOP = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A fit the model wrote as 86.5 or "86" becomes the integer 86, clamped to 0..100. */
function clampFit(value: unknown): unknown {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return value;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * A sentence list cut to the contract's maximum, blank entries dropped; a
 * missing list becomes `fallback` (an empty array where the contract allows
 * one, `undefined` where at least one entry is required so Zod still says so).
 */
function capList(value: unknown, fallback: unknown[] | undefined): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((s) => !(typeof s === "string" && s.trim() === ""))
      .slice(0, MAX_LIST);
  }
  return value === undefined || value === null ? fallback : value;
}

function normalizeTopEntry(entry: unknown): unknown {
  if (!isRecord(entry)) return entry;
  return {
    ...entry,
    fit: clampFit(entry.fit),
    reasons: capList(entry.reasons, undefined),
    risks: capList(entry.risks, []),
    recommendedVarietyIds: capList(entry.recommendedVarietyIds, []),
  };
}

/**
 * The crops payload made to fit the contract wherever the model's slip is
 * harmless: a non-integer or out-of-range fit, over-long lists, more than
 * three top crops, a missing `risks` / `recommendedVarietyIds` / `excluded`.
 * A wrong crop id or a missing reason is left for Zod to reject.
 */
export function normalizeCropInput(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    top: Array.isArray(input.top)
      ? input.top.slice(0, MAX_TOP).map(normalizeTopEntry)
      : input.top,
    excluded:
      input.excluded === undefined || input.excluded === null
        ? []
        : input.excluded,
  };
}

/** The same care for the variety ranking: integer fit, reasons cut to five. */
export function normalizeVarietyInput(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return {
    ...input,
    ranked: Array.isArray(input.ranked)
      ? input.ranked.map((entry) =>
          isRecord(entry)
            ? {
                ...entry,
                fit: clampFit(entry.fit),
                reasons: capList(entry.reasons, undefined),
              }
            : entry,
        )
      : input.ranked,
  };
}

export type ToolParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "no_tool_use" | "invalid"; issues?: unknown };

/**
 * Find the forced tool call in a response and validate its input. Returns a
 * discriminated result so callers raise a typed error instead of a parse
 * exception. `normalize` runs on the raw input before Zod sees it.
 */
export function parseToolInput<S extends z.ZodType>(
  message: Pick<Anthropic.Message, "content" | "stop_reason">,
  toolName: string,
  schema: S,
  normalize: (input: unknown) => unknown = (input) => input,
): ToolParseResult<z.infer<S>> {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === toolName,
  );
  if (!block) return { ok: false, reason: "no_tool_use" };
  const parsed = schema.safeParse(normalize(block.input));
  if (!parsed.success) {
    return { ok: false, reason: "invalid", issues: parsed.error.issues };
  }
  return { ok: true, value: parsed.data };
}
