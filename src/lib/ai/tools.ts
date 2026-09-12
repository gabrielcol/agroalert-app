import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  cropRecommendationSchema,
  varietyRecommendationSchema,
} from "@/lib/agro/recommendation-schema";

/**
 * Structured output via tool use: each recommendation is the input of a tool
 * whose JSON schema is derived from the frozen Zod contract. The model is
 * forced to call the tool; the tool input is then re-validated with the same
 * Zod schema (`parseToolInput`) before anything is stored.
 */

export const CROP_TOOL_NAME = "recommend_crops" as const;
export const VARIETY_TOOL_NAME = "rank_varieties" as const;

function inputSchemaFor(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input" });
  // The API wants a bare object schema, without the `$schema` marker.
  const { $schema: _ignored, ...rest } = json as Record<string, unknown>;
  void _ignored;
  return rest as Anthropic.Tool.InputSchema;
}

export const cropRecommendationTool: Anthropic.Tool = {
  name: CROP_TOOL_NAME,
  description:
    "Record the Crop Recommendation for the farmer's parcel: the top 1-3 crops " +
    "(best first) with fit 0-100, Romanian reasons and risks, the suggested " +
    "sowing window, recommended variety names and a confidence, plus every " +
    "other dictionary crop under `excluded` with a one-sentence Romanian reason.",
  input_schema: inputSchemaFor(cropRecommendationSchema),
};

export const varietyRecommendationTool: Anthropic.Tool = {
  name: VARIETY_TOOL_NAME,
  description:
    "Record the Variety Recommendation for one crop: every variety listed for " +
    "that crop in the Crop Dictionary, ranked best first with fit 0-100 and " +
    "Romanian reasons.",
  input_schema: inputSchemaFor(varietyRecommendationSchema),
};

/** Both calls send the same tool list so the cached prefix is shared. */
export const RECOMMENDATION_TOOLS: Anthropic.Tool[] = [
  cropRecommendationTool,
  varietyRecommendationTool,
];

export type ToolParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "no_tool_use" | "invalid"; issues?: unknown };

/**
 * Find the forced tool call in a response and validate its input. Returns a
 * discriminated result so callers raise a typed error instead of a parse
 * exception.
 */
export function parseToolInput<S extends z.ZodType>(
  message: Pick<Anthropic.Message, "content" | "stop_reason">,
  toolName: string,
  schema: S,
): ToolParseResult<z.infer<S>> {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === toolName,
  );
  if (!block) return { ok: false, reason: "no_tool_use" };
  const parsed = schema.safeParse(block.input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", issues: parsed.error.issues };
  }
  return { ok: true, value: parsed.data };
}
