import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/env";
import { MissingApiKeyError } from "./errors";

/**
 * The Anthropic client, created lazily so the app boots without a key (dev,
 * Playwright) and only the AI call fails when it is missing.
 */
export function createAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}
