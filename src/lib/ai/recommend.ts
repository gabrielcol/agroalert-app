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
import { usageOf, type AiCallLogger } from "./call-log";
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
  /** Records one `ai_call` row per API call; omitted, nothing is written. */
  log?: AiCallLogger;
};

/** What a call answers: the validated result plus its `ai_call` row id. */
export type Logged<T> = { result: T; aiCallId: string | null };

/** Room for 3 crops with reasons plus ~20 exclusions; well under the cap. */
const MAX_TOKENS = 8000;

/**
 * One `messages.create` call, timed, with exactly one `ai_call` row written
 * for it whatever happens (issue 0013). `parse` runs inside the same try, so
 * an `AiOutputError` raised on a message the API did return is logged as an
 * error *with* that message's tokens and raw response; an API throw is logged
 * with null tokens and no raw response.
 */
async function loggedCreate<T>(args: {
  client: MessagesClient;
  log: AiCallLogger | undefined;
  kind: "crops" | "varieties";
  fieldProfileId: string;
  model: string;
  params: Anthropic.MessageCreateParamsNonStreaming;
  parse: (message: Anthropic.Message) => T;
}): Promise<Logged<T>> {
  const startedAt = performance.now();
  let message: Anthropic.Message | null = null;
  try {
    message = await args.client.messages.create(args.params);
    const value = args.parse(message);
    const logged = await args.log?.({
      kind: args.kind,
      fieldProfileId: args.fieldProfileId,
      model: args.model,
      responseModel: message.model ?? null,
      ...usageOf(message),
      durationMs: Math.round(performance.now() - startedAt),
      status: "ok",
      errorName: null,
      errorMessage: null,
      rawResponse: message,
    });
    return { result: value, aiCallId: logged?.id ?? null };
  } catch (error) {
    const usage = message
      ? usageOf(message)
      : {
          inputTokens: null,
          outputTokens: null,
          cacheReadInputTokens: null,
          cacheCreationInputTokens: null,
        };
    await args.log?.({
      kind: args.kind,
      fieldProfileId: args.fieldProfileId,
      model: args.model,
      responseModel: message?.model ?? null,
      ...usage,
      durationMs: Math.round(performance.now() - startedAt),
      status: "error",
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      rawResponse: message,
    });
    throw error;
  }
}

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
): Promise<Logged<CropRecommendation>> {
  return loggedCreate({
    client: input.client,
    log: input.log,
    kind: "crops",
    fieldProfileId: input.profile.id,
    model: input.model,
    params: {
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
    },
    parse: (message) => {
      const parsed = parseToolInput(
        message,
        CROP_TOOL_NAME,
        cropRecommendationSchema,
      );
      if (!parsed.ok) throw toolError(parsed, CROP_TOOL_NAME);
      return enforceCandidateRule(parsed.value, input.today);
    },
  });
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
): Promise<Logged<VarietyRecommendation>> {
  if (varietyNames(input.cropId).length === 0) {
    // No API call, so no `ai_call` row: the rule is one row per call.
    return { result: { cropId: input.cropId, ranked: [] }, aiCallId: null };
  }
  return loggedCreate({
    client: input.client,
    log: input.log,
    kind: "varieties",
    fieldProfileId: input.profile.id,
    model: input.model,
    params: {
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
    },
    parse: (message) => {
      const parsed = parseToolInput(
        message,
        VARIETY_TOOL_NAME,
        varietyRecommendationSchema,
      );
      if (!parsed.ok) throw toolError(parsed, VARIETY_TOOL_NAME);
      return enforceVarietyCoverage(parsed.value, input.cropId);
    },
  });
}
