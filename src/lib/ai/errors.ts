/**
 * Typed failures of the recommendation pipeline. The router maps them to
 * tRPC codes; the screens show the retry screen for all of them (ADR 0003:
 * no degraded recommendation).
 */

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set; the AI call cannot run.");
    this.name = "MissingApiKeyError";
  }
}

/** The model answered, but not in the frozen output shape. */
export class AiOutputError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown = undefined,
  ) {
    super(message);
    this.name = "AiOutputError";
  }
}

/**
 * The model ran out of output tokens mid-answer (`stop_reason: "max_tokens"`),
 * so the tool arguments are truncated JSON. A subclass of `AiOutputError`: the
 * router still maps it to `AI_INVALID_OUTPUT`, but it is told apart in the
 * `ai_call` row's `errorName` and is deliberately NOT retried — the identical
 * request would truncate identically (issue 0018).
 */
export class AiOutputTruncatedError extends AiOutputError {
  constructor(toolName: string) {
    super(
      `The model hit max_tokens before finishing the ${toolName} arguments.`,
    );
    this.name = "AiOutputTruncatedError";
  }
}

/** The Weather Brief could not be produced (Open-Meteo down, rate-limited). */
export class WeatherUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Weather Brief unavailable.", { cause });
    this.name = "WeatherUnavailableError";
  }
}
