import type Anthropic from "@anthropic-ai/sdk";

import { varietyNames, type CropId } from "@/lib/agro/crop-dictionary";
import type { FieldProfile } from "@/lib/agro/field-profile";
import {
  cropRecommendationSchema,
  varietyRecommendationSchema,
  type CropRecommendation,
  type VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import type { WeatherBrief } from "@/lib/weather/schema";
import { candidateCropIds } from "./candidates";
import { AiOutputError } from "./errors";
import {
  buildCropUserMessage,
  buildSystem,
  buildVarietyUserMessage,
} from "./prompts";
import {
  CROP_TOOL_NAME,
  RECOMMENDATION_TOOLS,
  VARIETY_TOOL_NAME,
  parseToolInput,
} from "./tools";

/**
 * The two Claude calls, with the client injected so tests run against a fake.
 * One structured call per step: no streaming, no agent loop (issue 0006).
 */

/** The narrow slice of the SDK the recommendation needs. */
export type MessagesClient = {
  messages: {
    create(
      params: Anthropic.MessageCreateParamsNonStreaming,
    ): Promise<Anthropic.Message>;
  };
};

export type RecommendInput = {
  client: MessagesClient;
  model: string;
  profile: FieldProfile;
  brief: WeatherBrief;
  today: string;
};

/** Room for 3 crops with reasons plus ~20 exclusions; well under the cap. */
const MAX_TOKENS = 8000;

function toolError(
  result: { ok: false; reason: "no_tool_use" | "invalid"; issues?: unknown },
  toolName: string,
): AiOutputError {
  return result.reason === "no_tool_use"
    ? new AiOutputError(`The model did not call ${toolName}.`)
    : new AiOutputError(
        `The ${toolName} output failed validation.`,
        result.issues,
      );
}

/**
 * Enforce the candidate rule on the model's answer: a top crop whose window
 * is neither open nor opening within the horizon is moved to `excluded`
 * with a stated reason. An empty top list after that is an output error.
 */
export function enforceCandidateRule(
  result: CropRecommendation,
  today: string,
): CropRecommendation {
  const candidates = new Set(candidateCropIds(today));
  const top = result.top.filter((c) => candidates.has(c.cropId));
  const demoted = result.top
    .filter((c) => !candidates.has(c.cropId))
    .map((c) => ({
      cropId: c.cropId,
      reason:
        "Fereastra de semănat nu este deschisă și nu se deschide în următoarele 46 de zile.",
    }));
  if (top.length === 0) {
    throw new AiOutputError("No recommended crop passes the candidate rule.");
  }
  const seen = new Set(result.excluded.map((e) => e.cropId));
  const excluded = [
    ...result.excluded,
    ...demoted.filter((d) => !seen.has(d.cropId)),
  ];
  return { top, excluded };
}

export async function recommendCrops(
  input: RecommendInput,
): Promise<CropRecommendation> {
  const message = await input.client.messages.create({
    model: input.model,
    max_tokens: MAX_TOKENS,
    system: buildSystem(),
    tools: RECOMMENDATION_TOOLS,
    tool_choice: { type: "tool", name: CROP_TOOL_NAME },
    messages: [
      buildCropUserMessage({
        profile: input.profile,
        brief: input.brief,
        today: input.today,
      }),
    ],
  });
  const parsed = parseToolInput(
    message,
    CROP_TOOL_NAME,
    cropRecommendationSchema,
  );
  if (!parsed.ok) throw toolError(parsed, CROP_TOOL_NAME);
  return enforceCandidateRule(parsed.value, input.today);
}

/**
 * The ranking must cover exactly the dictionary's varieties of the crop:
 * invented names are dropped, an omitted one is an output error.
 */
export function enforceVarietyCoverage(
  result: VarietyRecommendation,
  cropId: CropId,
): VarietyRecommendation {
  const expected = varietyNames(cropId);
  const known = new Set(expected);
  const ranked = result.ranked.filter((v) => known.has(v.varietyName));
  const covered = new Set(ranked.map((v) => v.varietyName));
  const missing = expected.filter((name) => !covered.has(name));
  if (missing.length > 0) {
    throw new AiOutputError(`Variety ranking omitted: ${missing.join(", ")}.`, {
      missing,
    });
  }
  return { cropId, ranked };
}

export async function rankVarieties(
  input: RecommendInput & { cropId: CropId },
): Promise<VarietyRecommendation> {
  if (varietyNames(input.cropId).length === 0) {
    return { cropId: input.cropId, ranked: [] };
  }
  const message = await input.client.messages.create({
    model: input.model,
    max_tokens: MAX_TOKENS,
    system: buildSystem(),
    tools: RECOMMENDATION_TOOLS,
    tool_choice: { type: "tool", name: VARIETY_TOOL_NAME },
    messages: [
      buildVarietyUserMessage({
        profile: input.profile,
        brief: input.brief,
        today: input.today,
        cropId: input.cropId,
      }),
    ],
  });
  const parsed = parseToolInput(
    message,
    VARIETY_TOOL_NAME,
    varietyRecommendationSchema,
  );
  if (!parsed.ok) throw toolError(parsed, VARIETY_TOOL_NAME);
  return enforceVarietyCoverage(parsed.value, input.cropId);
}
