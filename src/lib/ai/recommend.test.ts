import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import {
  cropRecommendationFixture,
  varietyRecommendationFixture,
} from "@/lib/agro/recommendation-fixture";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { AiOutputError } from "./errors";
import {
  enforceCandidateRule,
  enforceVarietyCoverage,
  rankVarieties,
  recommendCrops,
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
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
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
    const result = await recommendCrops({ client, ...base });
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
    const result = await recommendCrops({ client, ...base });
    expect(result.top.map((c) => c.cropId)).toEqual(["grau_toamna"]);
    expect(result.excluded).toEqual([
      { cropId: "porumb", reason: expect.stringContaining("46") },
    ]);
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
    const result = await rankVarieties({
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
    const result = await rankVarieties({ client, ...base, cropId: "linte" });
    expect(result).toEqual({ cropId: "linte", ranked: [] });
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
