import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/env";
import { MissingApiKeyError } from "./errors";

/**
 * How long one HTTP attempt may take, in milliseconds. The SDK default is ten
 * minutes, which is longer than any proxy in front of the app will wait: the
 * request would be cut off elsewhere and the app would never learn why. One
 * minute is well past a healthy call (~40 s observed) and short enough that a
 * stuck attempt fails on our own terms, with a logged `errorName` (issue 0018).
 */
export const AI_REQUEST_TIMEOUT_MS = 60_000;

/**
 * How many times the SDK retries a *transport* failure (timeout, 429, 5xx).
 * One retry, not the SDK's two: worst case per step is then 60 s x 2 SDK
 * attempts x 2 correction attempts (see `recommend.ts`) ~ 4 minutes.
 */
export const AI_MAX_RETRIES = 1;

/**
 * The Anthropic client, created lazily so the app boots without a key (dev,
 * Playwright) and only the AI call fails when it is missing.
 */
export function createAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  return new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: AI_REQUEST_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
  });
}
