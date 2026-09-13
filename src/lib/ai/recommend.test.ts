import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import {
  cropRecommendationFixture,
  varietyRecommendationFixture,
} from "@/lib/agro/recommendation-fixture";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import type { AiCallLogger } from "./call-log";
import { AiOutputError, AiOutputTruncatedError } from "./errors";
import { CROP_IDS } from "@/lib/agro/crop-dictionary";
import {
  enforceCandidateRule,
  enforceVarietyCoverage,
  excludedReasonFor,
  rankVarieties,
  recommendCrops,
  type AttemptTrace,
  type MessagesClient,
} from "./recommend";
import { CROP_TOOL_NAME, VARIETY_TOOL_NAME } from "./tools";

const TODAY = "2026-09-12";
/** The winter wheat varieties as listed in the compact Crop Dictionary. */
const WHEAT_VARIETIES = ["Izvor", "Ursita", "Glosa", "Otilia", "Voinic"];

const profile: FieldProfile = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T00:00:00Z"),
};

function reply(content: Anthropic.ContentBlock[]): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content,
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: {
      input_tokens: 1200,
      output_tokens: 340,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 100,
    } as Anthropic.Usage,
  } as Anthropic.Message;
}

function toolReply(name: string, input: unknown) {
  return reply([
    { type: "tool_use", id: "t1", name, input } as Anthropic.ToolUseBlock,
  ]);
}

function fakeClient(message: Anthropic.Message) {
  const create = vi.fn().mockResolvedValue(message);
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

/** The same reply, ended differently (`max_tokens` for a truncated answer). */
function endedWith(
  message: Anthropic.Message,
  stopReason: Anthropic.Message["stop_reason"],
): Anthropic.Message {
  return { ...message, stop_reason: stopReason };
}

/** A client that answers each call with the next message in the list. */
function sequenceClient(...messages: Anthropic.Message[]) {
  const create = vi.fn();
  for (const message of messages) create.mockResolvedValueOnce(message);
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

/** The turns one recorded `messages.create` call was given. */
function turnsOf(params: unknown): Anthropic.MessageParam[] {
  return (params as Anthropic.MessageCreateParamsNonStreaming).messages;
}

function blocksOf(turn: Anthropic.MessageParam): Anthropic.ContentBlockParam[] {
  return turn.content as Anthropic.ContentBlockParam[];
}

function toolResultsOf(
  turn: Anthropic.MessageParam,
): Anthropic.ToolResultBlockParam[] {
  return blocksOf(turn).filter(
    (b): b is Anthropic.ToolResultBlockParam => b.type === "tool_result",
  );
}

/** The dictionary's five winter-wheat varieties, all ranked — a valid answer. */
const FULL_WHEAT_RANKING = {
  cropId: "grau_toamna",
  ranked: WHEAT_VARIETIES.map((name, i) => ({
    varietyName: name,
    fit: 90 - i * 5,
    reasons: ["Motiv."],
  })),
};

const base = {
  model: "claude-sonnet-5",
  profile,
  brief: weatherBriefFixture(TODAY),
  today: TODAY,
};

describe("recommendCrops", () => {
  it("forces the crop tool, caches the dictionary and returns the validated output", async () => {
    const { client, create } = fakeClient(
      toolReply(CROP_TOOL_NAME, cropRecommendationFixture),
    );
    const { result } = await recommendCrops({ client, ...base });
    expect(result.top.map((c) => c.cropId)).toEqual([
      "grau_toamna",
      "orz_toamna",
      "rapita_toamna",
    ]);

    const params = create.mock.calls[0][0] as Anthropic.MessageCreateParams;
    expect(params.model).toBe("claude-sonnet-5");
    expect(params.tool_choice).toEqual({ type: "tool", name: CROP_TOOL_NAME });
    const system = params.system as Anthropic.TextBlockParam[];
    expect(system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(params.tools?.map((t) => (t as Anthropic.Tool).name)).toEqual([
      CROP_TOOL_NAME,
      VARIETY_TOOL_NAME,
    ]);
  });

  it("surfaces a malformed tool payload as AiOutputError, not a parse exception", async () => {
    const { client } = fakeClient(
      toolReply(CROP_TOOL_NAME, { top: [{ cropId: "banane" }], excluded: [] }),
    );
    await expect(recommendCrops({ client, ...base })).rejects.toBeInstanceOf(
      AiOutputError,
    );
  });

  it("surfaces a prose answer without a tool call as AiOutputError", async () => {
    const { client } = fakeClient(
      reply([{ type: "text", text: "Grâu.", citations: null }]),
    );
    await expect(recommendCrops({ client, ...base })).rejects.toThrow(
      /did not call/,
    );
  });

  it("demotes a top crop whose window opens past the 46-day horizon", async () => {
    // porumb is a spring crop: its window opens in April, far beyond day 46.
    const withMaize = {
      top: [
        cropRecommendationFixture.top[0],
        { ...cropRecommendationFixture.top[1], cropId: "porumb" },
      ],
      excluded: [],
    };
    const { client } = fakeClient(toolReply(CROP_TOOL_NAME, withMaize));
    const { result } = await recommendCrops({ client, ...base });
    expect(result.top.map((c) => c.cropId)).toEqual(["grau_toamna"]);
    // The demotion comes first; the server then fills in the rest (0020).
    expect(result.excluded[0]).toEqual({
      cropId: "porumb",
      reason: expect.stringContaining("46"),
    });
    expect(result.excluded).toHaveLength(CROP_IDS.length - 1);
  });

  it("fills every crop the model did not mention into excluded, once, in dictionary order (issue 0020)", async () => {
    // The model now writes exclusions only for the candidates it leaves out.
    const lean = {
      top: cropRecommendationFixture.top,
      excluded: [{ cropId: "secara", reason: "Prea puțin căutată aici." }],
    };
    const { client } = fakeClient(toolReply(CROP_TOOL_NAME, lean));
    const { result } = await recommendCrops({ client, ...base });

    const ids = result.excluded.map((e) => e.cropId);
    expect(ids[0]).toBe("secara"); // the model's own entry stays first
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids, ...result.top.map((c) => c.cropId)].sort()).toEqual(
      [...CROP_IDS].sort(),
    );
    // A candidate the model skipped without a word gets a plain reason...
    expect(
      result.excluded.find((e) => e.cropId === "triticale")?.reason,
    ).toMatch(/primele recomandări/);
    // ...and a non-candidate names its next sowing window in Romanian.
    expect(result.excluded.find((e) => e.cropId === "porumb")?.reason).toMatch(
      /următoarea începe pe \d+ (aprilie|martie)/,
    );
    expect(result.excluded.filter((e) => e.cropId === "grau_toamna")).toEqual(
      [],
    );
  });

  it("forgives a non-integer fit, over-long lists, a fourth top crop and a missing risks key (issue 0020)", async () => {
    const [wheat, barley, rape] = cropRecommendationFixture.top;
    const sloppy = {
      top: [
        {
          ...wheat,
          fit: 86.4,
          reasons: ["a", "b", "c", "d", "e", "f", "g"],
          risks: undefined,
          recommendedVarietyIds: undefined,
        },
        { ...barley, fit: "78" },
        { ...rape, fit: 140 },
        { ...wheat, cropId: "secara" },
      ],
      // `excluded` omitted entirely
    };
    const { client } = fakeClient(toolReply(CROP_TOOL_NAME, sloppy));
    const { result } = await recommendCrops({ client, ...base });
    expect(result.top).toHaveLength(3);
    expect(result.top[0]).toMatchObject({
      fit: 86,
      reasons: ["a", "b", "c", "d", "e"],
      risks: [],
      recommendedVarietyIds: [],
    });
    expect(result.top[1].fit).toBe(78);
    expect(result.top[2].fit).toBe(100);
  });

  it("still rejects an unknown crop id after normalisation", async () => {
    const { client } = fakeClient(
      toolReply(CROP_TOOL_NAME, {
        top: [{ ...cropRecommendationFixture.top[0], cropId: "grau" }],
        excluded: [],
      }),
    );
    await expect(recommendCrops({ client, ...base })).rejects.toBeInstanceOf(
      AiOutputError,
    );
  });

  it("asks for 16000 output tokens with strict tools", async () => {
    const { client, create } = fakeClient(
      toolReply(CROP_TOOL_NAME, cropRecommendationFixture),
    );
    await recommendCrops({ client, ...base });
    const params = create.mock.calls[0][0] as Anthropic.MessageCreateParams;
    expect(params.max_tokens).toBe(16000);
    expect((params.tools?.[0] as Anthropic.Tool).strict).toBe(true);
  });
});

describe("excludedReasonFor", () => {
  it("names the next sowing window of a non-candidate", () => {
    expect(excludedReasonFor("porumb", TODAY)).toMatch(
      /46 de zile; următoarea începe pe 1 aprilie\.$/,
    );
  });
});

describe("enforceCandidateRule", () => {
  it("throws when nothing in the top list is a candidate", () => {
    expect(() =>
      enforceCandidateRule(
        {
          top: [{ ...cropRecommendationFixture.top[0], cropId: "porumb" }],
          excluded: [],
        },
        TODAY,
      ),
    ).toThrow(AiOutputError);
  });
});

describe("rankVarieties", () => {
  it("returns the ranking when every dictionary variety is covered", async () => {
    const full = {
      cropId: "grau_toamna",
      ranked: WHEAT_VARIETIES.map((name, i) => ({
        varietyName: name,
        fit: 90 - i * 5,
        reasons: ["Motiv."],
      })),
    };
    const { client, create } = fakeClient(toolReply(VARIETY_TOOL_NAME, full));
    const { result } = await rankVarieties({
      client,
      ...base,
      cropId: "grau_toamna",
    });
    expect(result.ranked).toHaveLength(5);
    const params = create.mock.calls[0][0] as Anthropic.MessageCreateParams;
    expect(params.tool_choice).toEqual({
      type: "tool",
      name: VARIETY_TOOL_NAME,
    });
  });

  it("skips the model for a crop with no listed varieties", async () => {
    const { client, create } = fakeClient(
      toolReply(VARIETY_TOOL_NAME, varietyRecommendationFixture),
    );
    const logged = await rankVarieties({ client, ...base, cropId: "linte" });
    expect(logged).toEqual({
      result: { cropId: "linte", ranked: [] },
      aiCallId: null,
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("enforceVarietyCoverage", () => {
  it("drops invented varieties and rejects omissions", () => {
    const ranked = WHEAT_VARIETIES.map((name) => ({
      varietyName: name,
      fit: 50,
      reasons: ["Motiv."],
    }));
    const withInvented = {
      cropId: "grau_toamna" as const,
      ranked: [...ranked, { varietyName: "Fantezia", fit: 99, reasons: ["x"] }],
    };
    expect(
      enforceVarietyCoverage(withInvented, "grau_toamna").ranked,
    ).toHaveLength(5);

    expect(() =>
      enforceVarietyCoverage(
        { cropId: "grau_toamna" as const, ranked: ranked.slice(0, 3) },
        "grau_toamna",
      ),
    ).toThrow(/omitted/);
  });
});

describe("the ai_call log", () => {
  const logger = () =>
    vi.fn<AiCallLogger>().mockResolvedValue({ id: "call_1" });

  it("records the model, the tokens and the raw response of a successful call", async () => {
    const message = toolReply(CROP_TOOL_NAME, cropRecommendationFixture);
    const { client } = fakeClient(message);
    const log = logger();

    const { aiCallId } = await recommendCrops({ client, ...base, log });

    expect(aiCallId).toBe("call_1");
    expect(log).toHaveBeenCalledTimes(1);
    const record = log.mock.calls[0][0];
    expect(record).toMatchObject({
      kind: "crops",
      fieldProfileId: "fp1",
      model: "claude-sonnet-5",
      responseModel: "claude-sonnet-5",
      inputTokens: 1200,
      outputTokens: 340,
      cacheReadInputTokens: 900,
      cacheCreationInputTokens: 100,
      status: "ok",
      errorName: null,
      errorMessage: null,
    });
    expect(record.rawResponse).toBe(message);
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records an API throw with no tokens and no raw response, then rethrows", async () => {
    const failure = new Error("overloaded");
    failure.name = "APIError";
    const client: MessagesClient = {
      messages: { create: vi.fn().mockRejectedValue(failure) },
    };
    const log = logger();

    await expect(recommendCrops({ client, ...base, log })).rejects.toBe(
      failure,
    );
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatchObject({
      status: "error",
      responseModel: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadInputTokens: null,
      cacheCreationInputTokens: null,
      errorName: "APIError",
      errorMessage: "overloaded",
      rawResponse: null,
    });
  });

  it("records invalid output as an error but keeps the tokens and the raw response", async () => {
    const message = toolReply(VARIETY_TOOL_NAME, { cropId: "grau_toamna" });
    const { client } = fakeClient(message);
    const log = logger();

    await expect(
      rankVarieties({ client, ...base, cropId: "grau_toamna", log }),
    ).rejects.toBeInstanceOf(AiOutputError);
    // Two rows: the correction retry (issue 0018) is itself an API call, and
    // this fake answers it with the same invalid output.
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toMatchObject({
      kind: "varieties",
      status: "error",
      errorName: "AiOutputError",
      inputTokens: 1200,
      outputTokens: 340,
      rawResponse: message,
    });
    // The Zod issues ride along in the row (issue 0020): "ranked" is missing.
    expect(log.mock.calls[0][0].errorMessage).toMatch(
      /failed validation\. Issues: \[.*"ranked".*\]/,
    );
  });

  it("writes nothing and answers a null id when no logger is injected", async () => {
    const { client } = fakeClient(
      toolReply(CROP_TOOL_NAME, cropRecommendationFixture),
    );
    const { aiCallId } = await recommendCrops({ client, ...base });
    expect(aiCallId).toBeNull();
  });
});

describe("the output retry", () => {
  const logger = () =>
    vi
      .fn<AiCallLogger>()
      .mockResolvedValueOnce({ id: "call_1" })
      .mockResolvedValueOnce({ id: "call_2" });

  const BAD_CROPS = { top: [{ cropId: "banane" }], excluded: [] };
  const GOOD_CROPS = toolReply(CROP_TOOL_NAME, cropRecommendationFixture);
  const GOOD_VARIETIES = toolReply(VARIETY_TOOL_NAME, FULL_WHEAT_RANKING);

  it("feeds the validation issues back as an is_error tool_result and succeeds on the second call", async () => {
    const { client, create } = sequenceClient(
      toolReply(CROP_TOOL_NAME, BAD_CROPS),
      GOOD_CROPS,
    );

    const { result } = await recommendCrops({ client, ...base });
    expect(result.top[0].cropId).toBe("grau_toamna");
    expect(create).toHaveBeenCalledTimes(2);

    const turns = turnsOf(create.mock.calls[1][0]);
    expect(turns).toHaveLength(3);
    expect(turns[0].role).toBe("user");

    // The failed assistant turn is replayed as request blocks.
    expect(turns[1].role).toBe("assistant");
    expect(blocksOf(turns[1])).toEqual([
      { type: "tool_use", id: "t1", name: CROP_TOOL_NAME, input: BAD_CROPS },
    ]);

    // …and answered, first block first, with the validation issues.
    expect(turns[2].role).toBe("user");
    const [toolResult] = toolResultsOf(turns[2]);
    expect(blocksOf(turns[2])[0]).toBe(toolResult);
    expect(toolResult).toMatchObject({ tool_use_id: "t1", is_error: true });
    expect(String(toolResult.content)).toContain("failed validation");
    expect(String(toolResult.content)).toContain("invalid_value");
    expect(String(toolResult.content)).toContain(
      `Call ${CROP_TOOL_NAME} again, exactly once`,
    );

    // The cached prefix and the forcing are untouched, so attempt 2 reads cache.
    const first = create.mock.calls[0][0] as Anthropic.MessageCreateParams;
    const second = create.mock.calls[1][0] as Anthropic.MessageCreateParams;
    expect(second.tool_choice).toEqual(first.tool_choice);
    expect(second.system).toEqual(first.system);
    expect(second.tools).toEqual(first.tools);
    expect(
      (second.system as Anthropic.TextBlockParam[])[1].cache_control,
    ).toEqual({ type: "ephemeral" });
  });

  it("tells the model to stop answering in prose when it made no tool call", async () => {
    const { client, create } = sequenceClient(
      reply([{ type: "text", text: "Grâu de toamnă.", citations: null }]),
      GOOD_CROPS,
    );

    const { result } = await recommendCrops({ client, ...base });
    expect(result.top[0].cropId).toBe("grau_toamna");

    const turns = turnsOf(create.mock.calls[1][0]);
    expect(blocksOf(turns[1])).toEqual([
      { type: "text", text: "Grâu de toamnă." },
    ]);
    expect(toolResultsOf(turns[2])).toHaveLength(0);
    expect(blocksOf(turns[2])).toEqual([
      { type: "text", text: expect.stringContaining("did not call") },
    ]);
  });

  it("retries a candidate-rule failure as the invalid-arguments shape", async () => {
    const offSeason = {
      top: [{ ...cropRecommendationFixture.top[0], cropId: "porumb" }],
      excluded: [],
    };
    const { client, create } = sequenceClient(
      toolReply(CROP_TOOL_NAME, offSeason),
      GOOD_CROPS,
    );

    const { result } = await recommendCrops({ client, ...base });
    expect(result.top[0].cropId).toBe("grau_toamna");
    expect(create).toHaveBeenCalledTimes(2);
    const [toolResult] = toolResultsOf(turnsOf(create.mock.calls[1][0])[2]);
    expect(String(toolResult.content)).toContain("candidate rule");
  });

  it("retries the variety ranking for invalid arguments", async () => {
    const { client, create } = sequenceClient(
      toolReply(VARIETY_TOOL_NAME, { cropId: "grau_toamna" }),
      GOOD_VARIETIES,
    );

    const { result } = await rankVarieties({
      client,
      ...base,
      cropId: "grau_toamna",
    });
    expect(result.ranked).toHaveLength(5);
    expect(create).toHaveBeenCalledTimes(2);
    const [toolResult] = toolResultsOf(turnsOf(create.mock.calls[1][0])[2]);
    expect(String(toolResult.content)).toContain(
      `The ${VARIETY_TOOL_NAME} arguments failed validation`,
    );
  });

  it("retries the variety ranking for a prose answer", async () => {
    const { client, create } = sequenceClient(
      reply([{ type: "text", text: "Glosa.", citations: null }]),
      GOOD_VARIETIES,
    );

    const { result } = await rankVarieties({
      client,
      ...base,
      cropId: "grau_toamna",
    });
    expect(result.ranked).toHaveLength(5);
    expect(blocksOf(turnsOf(create.mock.calls[1][0])[2])).toEqual([
      { type: "text", text: expect.stringContaining(VARIETY_TOOL_NAME) },
    ]);
  });

  it("answers every tool_use in the failed turn and names the wrong tool", async () => {
    const wrongThenBad = reply([
      {
        type: "tool_use",
        id: "t0",
        name: VARIETY_TOOL_NAME,
        input: {},
      } as Anthropic.ToolUseBlock,
      {
        type: "tool_use",
        id: "t1",
        name: CROP_TOOL_NAME,
        input: BAD_CROPS,
      } as Anthropic.ToolUseBlock,
    ]);
    const { client, create } = sequenceClient(wrongThenBad, GOOD_CROPS);

    await recommendCrops({ client, ...base });

    const results = toolResultsOf(turnsOf(create.mock.calls[1][0])[2]);
    expect(results.map((r) => r.tool_use_id)).toEqual(["t0", "t1"]);
    expect(results.every((r) => r.is_error)).toBe(true);
    expect(results[0].content).toBe(
      `Wrong tool. Call ${CROP_TOOL_NAME} instead.`,
    );
    expect(String(results[1].content)).toContain("failed validation");
  });

  it("numbers the two ai_call rows 1 and 2 and returns the row that answered", async () => {
    const { client } = sequenceClient(
      toolReply(CROP_TOOL_NAME, BAD_CROPS),
      GOOD_CROPS,
    );
    const log = logger();

    const { aiCallId } = await recommendCrops({ client, ...base, log });

    expect(aiCallId).toBe("call_2");
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toMatchObject({
      attempt: 1,
      status: "error",
      errorName: "AiOutputError",
    });
    expect(log.mock.calls[1][0]).toMatchObject({
      attempt: 2,
      status: "ok",
      errorName: null,
    });
  });

  it("does not retry a max_tokens truncation and names it in the row", async () => {
    const truncated = endedWith(
      toolReply(CROP_TOOL_NAME, BAD_CROPS),
      "max_tokens",
    );
    const { client, create } = sequenceClient(truncated, GOOD_CROPS);
    const log = logger();

    const error = await recommendCrops({ client, ...base, log }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AiOutputTruncatedError);
    expect(error).toBeInstanceOf(AiOutputError);
    expect(create).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatchObject({
      attempt: 1,
      status: "error",
      errorName: "AiOutputTruncatedError",
    });
  });

  it("rethrows a second failure, leaving two error rows", async () => {
    const { client, create } = fakeClient(toolReply(CROP_TOOL_NAME, BAD_CROPS));
    const log = logger();

    await expect(
      recommendCrops({ client, ...base, log }),
    ).rejects.toBeInstanceOf(AiOutputError);

    expect(create).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls.map(([row]) => [row.attempt, row.status])).toEqual([
      [1, "error"],
      [2, "error"],
    ]);
  });

  it("does not retry an API throw — the SDK already did", async () => {
    const failure = new Error("overloaded");
    failure.name = "APIError";
    const create = vi.fn().mockRejectedValue(failure);
    const log = logger();

    await expect(
      recommendCrops({ client: { messages: { create } }, ...base, log }),
    ).rejects.toBe(failure);

    expect(create).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("reports one AttemptTrace per API call", async () => {
    const { client } = sequenceClient(
      toolReply(CROP_TOOL_NAME, BAD_CROPS),
      GOOD_CROPS,
    );
    const traces: AttemptTrace[] = [];

    await recommendCrops({
      client,
      ...base,
      onAttempt: (trace) => traces.push(trace),
    });

    expect(traces).toHaveLength(2);
    expect(traces[0]).toMatchObject({
      attempt: 1,
      stopReason: "tool_use",
      errorName: "AiOutputError",
    });
    // The failed attempt carries its Zod issues as JSON text (issue 0020).
    expect(traces[0].issues).toMatch(/^\[.*"path".*\]/);
    expect(traces[1]).toMatchObject({
      attempt: 2,
      stopReason: "tool_use",
      errorName: null,
      issues: null,
    });
    expect(traces.every((t) => t.durationMs >= 0)).toBe(true);
  });
});
