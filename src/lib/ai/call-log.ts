import type Anthropic from "@anthropic-ai/sdk";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * One persisted row per call to the Anthropic API (issue 0013): the raw SDK
 * response, the model that answered and the token counts, for cost tracking
 * and debugging. The recorder is injected so `recommend.ts` stays free of
 * Prisma and the tests assert the row shape against a `vi.fn()`.
 */

export type AiCallRecord = {
  kind: "crops" | "varieties";
  fieldProfileId: string;
  /** The model we asked for. */
  model: string;
  /** The model that answered; null when the API threw. */
  responseModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
  durationMs: number;
  /** 1 for the step's first call, 2 for the correction retry (issue 0018). */
  attempt: number;
  status: "ok" | "error";
  errorName: string | null;
  errorMessage: string | null;
  /** The SDK `Message` exactly as returned, or null when the API threw. */
  rawResponse: unknown;
};

/** Writes one record and answers its row id, or null when the write failed. */
export type AiCallLogger = (
  record: AiCallRecord,
) => Promise<{ id: string } | null>;

/** The token counts as the SDK reports them; cache fields are optional. */
export function usageOf(message: Anthropic.Message): {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
} {
  const usage = message.usage as Anthropic.Usage | undefined;
  return {
    inputTokens: usage?.input_tokens ?? null,
    outputTokens: usage?.output_tokens ?? null,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? null,
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? null,
  };
}

/** The narrow slice of Prisma the recorder needs, so tests can fake it. */
export type AiCallDb = {
  aiCall: {
    create(args: {
      data: Prisma.AiCallUncheckedCreateInput;
    }): Promise<{ id: string }>;
  };
};

/**
 * The production recorder. A failing write is reported and swallowed: the
 * recommendation must never fail because logging failed (issue 0013).
 */
export function createPrismaAiCallLogger(
  db: AiCallDb | PrismaClient,
): AiCallLogger {
  return async (record) => {
    try {
      const created = await (db as AiCallDb).aiCall.create({
        data: {
          kind: record.kind,
          fieldProfileId: record.fieldProfileId,
          model: record.model,
          responseModel: record.responseModel,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          cacheReadInputTokens: record.cacheReadInputTokens,
          cacheCreationInputTokens: record.cacheCreationInputTokens,
          durationMs: record.durationMs,
          attempt: record.attempt,
          status: record.status,
          errorName: record.errorName,
          errorMessage: record.errorMessage,
          rawResponse:
            record.rawResponse === null || record.rawResponse === undefined
              ? undefined
              : (record.rawResponse as Prisma.InputJsonValue),
        },
      });
      return { id: created.id };
    } catch (error) {
      console.error("ai_call log write failed", error);
      return null;
    }
  };
}
