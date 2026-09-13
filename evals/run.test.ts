// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import type { MessagesClient } from "@/lib/ai/recommend";
import { CROP_TOOL_NAME } from "@/lib/ai/tools";
import { loadBriefs, loadCases, type LoadedCase } from "./lib/dataset";
import { formatOutcome, parseArgs, runCase } from "./run";

const briefs = loadBriefs();
const cases = loadCases();

function caseNamed(id: string): LoadedCase {
  const found = cases.find((entry) => entry.case.id === id);
  if (!found) throw new Error(`No eval case ${id}`);
  return { file: found.file, case: structuredClone(found.case) };
}

/** A `tool_use` response, shaped exactly like `src/lib/ai/recommend.test.ts`. */
function toolReply(name: string, input: unknown): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "tool_use", id: "t1", name, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 340 } as Anthropic.Usage,
  } as Anthropic.Message;
}

function fakeClient(message: Anthropic.Message) {
  const create = vi.fn().mockResolvedValue(message);
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

/**
 * A crop answer that satisfies every invariant for `crops-reviga-…` on
 * 2026-09-13: one candidate crop, its window copied from the dictionary, and an
 * `excluded` reason for each of the four candidates left out (the rest of the
 * dictionary is filled in server-side by `completeExcluded`).
 */
const VALID_CROP_ANSWER = {
  top: [
    {
      cropId: "grau_toamna",
      fit: 86,
      reasons: [
        "Cernoziomul reține apa necesară răsăririi.",
        "Fereastra de semănat se deschide în octombrie.",
      ],
      risks: ["Toamna este mai uscată decât media."],
      sowingWindow: { from: "2026-10-01", to: "2026-10-10" },
      recommendedVarietyIds: ["Glosa", "Izvor"],
      confidence: "high",
    },
  ],
  excluded: [
    { cropId: "orz_toamna", reason: "Rezistă mai slab la iernile grele." },
    { cropId: "secara", reason: "Valorifică mai slab solul bun și irigarea." },
    { cropId: "triticale", reason: "Preț mai mic decât grâul pe acest teren." },
    { cropId: "rapita_toamna", reason: "Fereastra de semănat este pe final." },
  ],
};

describe("parseArgs", () => {
  it("defaults to every case, concurrency 2 and the env model", () => {
    expect(parseArgs([])).toEqual({
      filter: null,
      kind: null,
      model: null,
      concurrency: 2,
    });
  });

  it("reads every flag", () => {
    expect(
      parseArgs([
        "--filter",
        "reviga",
        "--kind",
        "varieties",
        "--model",
        "claude-sonnet-5",
        "--concurrency",
        "4",
      ]),
    ).toEqual({
      filter: "reviga",
      kind: "varieties",
      model: "claude-sonnet-5",
      concurrency: 4,
    });
  });

  it("rejects an unknown flag, a bad kind and a missing value", () => {
    expect(() => parseArgs(["--all"])).toThrow(/Unknown argument/);
    expect(() => parseArgs(["--kind", "soils"])).toThrow(/--kind/);
    expect(() => parseArgs(["--filter"])).toThrow(/needs a value/);
  });
});

describe("runCase", () => {
  it("passes a case whose answer meets the invariants and the expect keys", async () => {
    const { client, create } = fakeClient(
      toolReply(CROP_TOOL_NAME, VALID_CROP_ANSWER),
    );
    const outcome = await runCase({
      client,
      model: "claude-haiku-4-5",
      entry: caseNamed("crops-reviga-cernoziom-irrigated"),
      briefs,
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(outcome.issues).toEqual([]);
    expect(outcome.ok).toBe(true);
    expect(outcome.kind).toBe("crops");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.error).toBeNull();
    expect(formatOutcome(outcome)).toMatch(
      /^PASS crops-reviga-cernoziom-irrigated \(\d+\.\ds, 1 attempt\)$/,
    );
  });

  it("reports the broken invariant instead of passing a bad answer", async () => {
    const { client } = fakeClient(
      toolReply(CROP_TOOL_NAME, {
        ...VALID_CROP_ANSWER,
        top: [
          {
            ...VALID_CROP_ANSWER.top[0],
            reasons: ["The soil is deep and holds water."],
          },
        ],
      }),
    );
    const outcome = await runCase({
      client,
      model: "claude-haiku-4-5",
      entry: caseNamed("crops-reviga-cernoziom-irrigated"),
      briefs,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.issues).toEqual([
      expect.stringContaining("not Romanian plain text"),
    ]);
    expect(formatOutcome(outcome)).toContain("rationale:");
  });

  it("short-circuits a case that fails the static checks, without calling the model", async () => {
    const { client, create } = fakeClient(
      toolReply(CROP_TOOL_NAME, VALID_CROP_ANSWER),
    );
    const entry = caseNamed("crops-reviga-cernoziom-irrigated");
    entry.case.today = "2026-09-14";

    const outcome = await runCase({
      client,
      model: "claude-haiku-4-5",
      entry,
      briefs,
    });

    expect(create).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
    expect(outcome.attempts).toEqual([]);
    expect(outcome.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('today "2026-09-14"')]),
    );
  });

  it("reports a failed call as that case's failure", async () => {
    const create = vi.fn().mockRejectedValue(new Error("connection reset"));
    const outcome = await runCase({
      client: { messages: { create } },
      model: "claude-haiku-4-5",
      entry: caseNamed("crops-reviga-cernoziom-irrigated"),
      briefs,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.error?.message).toBe("connection reset");
    expect(outcome.issues).toEqual(["Error: connection reset"]);
  });
});
