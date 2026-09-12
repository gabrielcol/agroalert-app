// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import {
  createPrismaAiCallLogger,
  usageOf,
  type AiCallRecord,
} from "./call-log";

const record: AiCallRecord = {
  kind: "crops",
  fieldProfileId: "fp1",
  model: "claude-sonnet-5",
  responseModel: "claude-sonnet-5",
  inputTokens: 1200,
  outputTokens: 340,
  cacheReadInputTokens: 900,
  cacheCreationInputTokens: null,
  durationMs: 42,
  status: "ok",
  errorName: null,
  errorMessage: null,
  rawResponse: { id: "msg_1" },
};

describe("usageOf", () => {
  it("reads the token counts and defaults the cache fields to null", () => {
    const message = {
      usage: { input_tokens: 7, output_tokens: 3 },
    } as Anthropic.Message;
    expect(usageOf(message)).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      cacheReadInputTokens: null,
      cacheCreationInputTokens: null,
    });
  });
});

describe("createPrismaAiCallLogger", () => {
  it("writes the row and answers its id", async () => {
    const create = vi.fn().mockResolvedValue({ id: "call_1" });
    const logger = createPrismaAiCallLogger({ aiCall: { create } });

    await expect(logger(record)).resolves.toEqual({ id: "call_1" });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "crops",
        fieldProfileId: "fp1",
        cacheReadInputTokens: 900,
        status: "ok",
        rawResponse: { id: "msg_1" },
      }),
    });
  });

  it("swallows a failing write so the recommendation still returns", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createPrismaAiCallLogger({
      aiCall: { create: vi.fn().mockRejectedValue(new Error("db gone")) },
    });

    await expect(logger(record)).resolves.toBeNull();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
