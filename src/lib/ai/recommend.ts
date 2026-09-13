import type Anthropic from "@anthropic-ai/sdk";

import {
  cropDictionary,
  isCropId,
  varietyNames,
  type CropId,
} from "@/lib/agro/crop-dictionary";
import type { FieldProfile } from "@/lib/agro/field-profile";
import {
  cropRecommendationSchema,
  varietyRecommendationSchema,
  type CropRecommendation,
  type VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import type { WeatherBrief } from "@/lib/weather/schema";
import {
  CANDIDATE_HORIZON_DAYS,
  candidateCropIds,
  formatDayRo,
  nextSowingWindow,
} from "./candidates";
import { usageOf, type AiCallLogger } from "./call-log";
import { AiOutputError, AiOutputTruncatedError } from "./errors";
import {
  buildCropUserMessage,
  buildSystem,
  buildVarietyUserMessage,
} from "./prompts";
import {
  CROP_TOOL_NAME,
  RECOMMENDATION_TOOLS,
  VARIETY_TOOL_NAME,
  normalizeCropInput,
  normalizeVarietyInput,
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

/**
 * What one API call cost and how it ended, handed to the caller as it happens
 * so the service can log a single line per step (issue 0018). It mirrors the
 * `ai_call` row but never touches the database, so it survives a failed write.
 */
export type AttemptTrace = {
  /** 1 for the step's first call, 2 for the correction retry. */
  attempt: number;
  durationMs: number;
  /** The response's `stop_reason`, or null when the API threw. */
  stopReason: string | null;
  /** null when the attempt succeeded. */
  errorName: string | null;
  /**
   * The validation issues of an `AiOutputError`, as truncated JSON, so the
   * log line says *what* failed (issue 0020); null otherwise.
   */
  issues: string | null;
};

export type RecommendInput = {
  client: MessagesClient;
  model: string;
  profile: FieldProfile;
  brief: WeatherBrief;
  today: string;
  /** Records one `ai_call` row per API call; omitted, nothing is written. */
  log?: AiCallLogger;
  /** Called once per API call, success or failure (issue 0018). */
  onAttempt?: (trace: AttemptTrace) => void;
};

/** What a call answers: the validated result plus its `ai_call` row id. */
export type Logged<T> = { result: T; aiCallId: string | null };

/**
 * Far more than the answer needs (3 crops with reasons plus a handful of
 * exclusions is 2-3k tokens): insurance against a truncation, which is not
 * retried (issue 0020). The 60 s client timeout still bounds the call.
 */
const MAX_TOKENS = 16000;

type LoggedCreateArgs<T> = {
  client: MessagesClient;
  log: AiCallLogger | undefined;
  kind: "crops" | "varieties";
  fieldProfileId: string;
  model: string;
  params: Anthropic.MessageCreateParamsNonStreaming;
  parse: (message: Anthropic.Message) => T;
  /** Which call of the step this is; goes on the row as `attempt`. */
  attempt: number;
  onAttempt: ((trace: AttemptTrace) => void) | undefined;
};

/**
 * One `messages.create` call, timed, with exactly one `ai_call` row written
 * for it whatever happens (issue 0013). `parse` runs inside the same try, so
 * an `AiOutputError` raised on a message the API did return is logged as an
 * error *with* that message's tokens and raw response; an API throw is logged
 * with null tokens and no raw response.
 */
async function loggedCreate<T>(args: LoggedCreateArgs<T>): Promise<Logged<T>> {
  const startedAt = performance.now();
  let message: Anthropic.Message | null = null;
  try {
    message = await args.client.messages.create(args.params);
    const value = args.parse(message);
    const durationMs = Math.round(performance.now() - startedAt);
    const logged = await args.log?.({
      kind: args.kind,
      fieldProfileId: args.fieldProfileId,
      model: args.model,
      responseModel: message.model ?? null,
      ...usageOf(message),
      durationMs,
      attempt: args.attempt,
      status: "ok",
      errorName: null,
      errorMessage: null,
      rawResponse: message,
    });
    args.onAttempt?.({
      attempt: args.attempt,
      durationMs,
      stopReason: message.stop_reason ?? null,
      errorName: null,
      issues: null,
    });
    return { result: value, aiCallId: logged?.id ?? null };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const errorName = error instanceof Error ? error.name : typeof error;
    const issues =
      error instanceof AiOutputError && error.issues !== undefined
        ? describeIssues(error, MAX_LOGGED_ISSUES_CHARS)
        : null;
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
      durationMs,
      attempt: args.attempt,
      status: "error",
      errorName,
      // The issues ride along in the row too, so the failure is readable
      // without opening `rawResponse` (issue 0020).
      errorMessage:
        error instanceof Error
          ? issues === null
            ? error.message
            : `${error.message} Issues: ${issues}`
          : String(error),
      rawResponse: message,
    });
    args.onAttempt?.({
      attempt: args.attempt,
      durationMs,
      stopReason: message?.stop_reason ?? null,
      errorName,
      issues,
    });
    throw error;
  }
}

/** The validation issues never grow the correction turn past this. */
const MAX_ISSUES_CHARS = 4000;
/** ...and never grow a log line or an `ai_call.errorMessage` past this. */
const MAX_LOGGED_ISSUES_CHARS = 1500;

/** The failed output as text the model (or an operator) can act on, bounded in size. */
function describeIssues(
  error: AiOutputError,
  limit: number = MAX_ISSUES_CHARS,
): string {
  let json: string | undefined;
  try {
    json = JSON.stringify(error.issues ?? { message: error.message });
  } catch {
    json = undefined;
  }
  const text = json ?? error.message;
  return text.length > limit ? `${text.slice(0, limit)}…(truncated)` : text;
}

/**
 * Replay the failed assistant turn as request blocks. Rebuilt block by block
 * rather than passed through verbatim: the response's `ContentBlock` union is
 * not the request's `ContentBlockParam` union, and thinking / redacted blocks
 * have no place in a correction.
 */
function echoAssistantTurn(
  failed: Anthropic.Message,
): Anthropic.MessageParam | null {
  const content: Array<Anthropic.ToolUseBlockParam | Anthropic.TextBlockParam> =
    [];
  for (const block of failed.content) {
    if (block.type === "tool_use") {
      content.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      });
    } else if (block.type === "text" && block.text.trim() !== "") {
      content.push({ type: "text", text: block.text });
    }
  }
  return content.length === 0 ? null : { role: "assistant", content };
}

/**
 * The user turn that answers the failed one. Every `tool_use` the model made
 * must be answered — the API rejects a turn that leaves one dangling — so the
 * expected tool gets the validation issues and any other tool is told it was
 * the wrong one. A prose answer (no `tool_use` at all) gets a plain
 * instruction instead.
 */
function buildCorrectionUserTurn(
  failed: Anthropic.Message,
  toolName: string,
  error: AiOutputError,
): Anthropic.MessageParam {
  const toolUses = failed.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const content: Array<
    Anthropic.ToolResultBlockParam | Anthropic.TextBlockParam
  > = toolUses.map((block) => ({
    type: "tool_result" as const,
    tool_use_id: block.id,
    is_error: true,
    content:
      block.name === toolName
        ? `The ${toolName} arguments failed validation: ${describeIssues(error)}. ` +
          `Call ${toolName} again, exactly once, with corrected arguments that satisfy ` +
          `the tool's JSON schema. Do not answer in prose and do not apologise.`
        : `Wrong tool. Call ${toolName} instead.`,
  }));
  if (!toolUses.some((block) => block.name === toolName)) {
    content.push({
      type: "text",
      text:
        `You did not call ${toolName}. Do not answer in prose. ` +
        `Call ${toolName} exactly once now with the complete answer.`,
    });
  }
  return { role: "user", content };
}

/**
 * One step: the API call, and — when the model answered but the answer failed
 * validation — exactly one correction call that feeds the bad turn and the
 * validation issues back (issue 0018). The "one API call = one `ai_call` row"
 * invariant holds: a retried step writes two rows, `attempt` 1 and 2.
 *
 * Not retried: an API throw (the SDK's own `maxRetries` covers transport) and
 * a `max_tokens` truncation (the same request would truncate again). Note that
 * `enforceCandidateRule` / `enforceVarietyCoverage` raise `AiOutputError` too,
 * so their failures ARE retried once, as the "invalid arguments" shape.
 *
 * `system` (with its cache breakpoint), `tools` and `tool_choice` are passed
 * through untouched, so the second call reads the same cached prefix.
 */
async function loggedCreateWithRetry<T>(
  args: Omit<LoggedCreateArgs<T>, "attempt"> & { toolName: string },
): Promise<Logged<T>> {
  // A holder, not a `let`: the closure assigns it, and TS would otherwise
  // narrow the outer binding to `null` from its initialiser.
  const seen: { message: Anthropic.Message | null } = { message: null };
  const parse = (message: Anthropic.Message): T => {
    seen.message = message;
    if (message.stop_reason === "max_tokens") {
      throw new AiOutputTruncatedError(args.toolName);
    }
    return args.parse(message);
  };

  const attempt = (
    attemptNumber: number,
    params: Anthropic.MessageCreateParamsNonStreaming,
  ) =>
    loggedCreate({
      client: args.client,
      log: args.log,
      kind: args.kind,
      fieldProfileId: args.fieldProfileId,
      model: args.model,
      params,
      parse,
      attempt: attemptNumber,
      onAttempt: args.onAttempt,
    });

  try {
    return await attempt(1, args.params);
  } catch (error) {
    const failed = seen.message;
    if (
      failed === null ||
      !(error instanceof AiOutputError) ||
      error instanceof AiOutputTruncatedError
    ) {
      throw error;
    }
    const echo = echoAssistantTurn(failed);
    const correction: Anthropic.MessageParam[] = [
      ...(echo ? [echo] : []),
      buildCorrectionUserTurn(failed, args.toolName, error),
    ];
    return await attempt(2, {
      ...args.params,
      messages: [...args.params.messages, ...correction],
    });
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

/** The server-written reason for a crop the model was not asked about. */
export function excludedReasonFor(cropId: CropId, today: string): string {
  const crop = cropDictionary.crops.find((c) => c.id === cropId);
  const next = crop ? nextSowingWindow(crop, today) : null;
  if (next === null) {
    return "Fereastra de semănat nu este deschisă în perioada următoare.";
  }
  return (
    `Fereastra de semănat nu este deschisă acum și nu se deschide în următoarele ` +
    `${CANDIDATE_HORIZON_DAYS} de zile; următoarea începe pe ${formatDayRo(next.from)}.`
  );
}

/**
 * The model only writes `excluded` reasons for the candidates it leaves out
 * (issue 0020: that is what made the Haiku call slow). Every other dictionary
 * crop is added here, once, in dictionary order, with a reason naming its
 * next sowing window, so the stored contract and the cultura screen keep
 * seeing the complete list. A candidate the model neither ranked nor
 * excluded gets a plain "not in the top three" reason.
 */
export function completeExcluded(
  result: CropRecommendation,
  today: string,
): CropRecommendation {
  const candidates = new Set(candidateCropIds(today));
  const mentioned = new Set<string>([
    ...result.top.map((c) => c.cropId),
    ...result.excluded.map((e) => e.cropId),
  ]);
  const filled = cropDictionary.crops
    .map((c) => c.id)
    .filter((id): id is CropId => isCropId(id) && !mentioned.has(id))
    .map((cropId) => ({
      cropId,
      reason: candidates.has(cropId)
        ? "Nu a intrat în primele recomandări pentru această parcelă."
        : excludedReasonFor(cropId, today),
    }));
  return { top: result.top, excluded: [...result.excluded, ...filled] };
}

export async function recommendCrops(
  input: RecommendInput,
): Promise<Logged<CropRecommendation>> {
  return loggedCreateWithRetry({
    client: input.client,
    log: input.log,
    onAttempt: input.onAttempt,
    kind: "crops",
    fieldProfileId: input.profile.id,
    model: input.model,
    toolName: CROP_TOOL_NAME,
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
        normalizeCropInput,
      );
      if (!parsed.ok) throw toolError(parsed, CROP_TOOL_NAME);
      return completeExcluded(
        enforceCandidateRule(parsed.value, input.today),
        input.today,
      );
    },
  });
}

/**
 * The ranking must cover exactly the dictionary's varieties of the crop:
 * invented names are dropped, a repeated one is dropped, an omitted one is an
 * output error.
 *
 * The dedupe is not belt-and-braces. `toStrictSchema` drops `uniqueItems`
 * from the tool schema and the model repeated a variety in 3 of 6 live Haiku
 * 4.5 runs (issue 0021), which collided the React keys on the soi screen and
 * marked two cards selected. The first occurrence wins — the list is ranked,
 * so that is the better rank — and the coverage check runs on the deduped
 * list.
 */
export function enforceVarietyCoverage(
  result: VarietyRecommendation,
  cropId: CropId,
): VarietyRecommendation {
  const expected = varietyNames(cropId);
  const known = new Set(expected);
  const covered = new Set<string>();
  const ranked = result.ranked.filter((v) => {
    if (!known.has(v.varietyName) || covered.has(v.varietyName)) return false;
    covered.add(v.varietyName);
    return true;
  });
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
  return loggedCreateWithRetry({
    client: input.client,
    log: input.log,
    onAttempt: input.onAttempt,
    kind: "varieties",
    fieldProfileId: input.profile.id,
    model: input.model,
    toolName: VARIETY_TOOL_NAME,
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
        normalizeVarietyInput,
      );
      if (!parsed.ok) throw toolError(parsed, VARIETY_TOOL_NAME);
      return enforceVarietyCoverage(parsed.value, input.cropId);
    },
  });
}
