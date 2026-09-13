// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  AI_MAX_RETRIES,
  AI_REQUEST_TIMEOUT_MS,
  createAnthropicClient,
} from "./client";
import { MissingApiKeyError } from "./errors";

/**
 * Issue 0018: the client must bound one attempt itself. The SDK's ten-minute
 * default is longer than anything in front of the app will wait, so a stuck
 * call would be cut off elsewhere and never explain itself in our logs.
 */

const envMock = vi.hoisted(() => ({
  ANTHROPIC_API_KEY: "sk-test" as string | undefined,
}));
vi.mock("@/env", () => ({ env: envMock }));

describe("createAnthropicClient", () => {
  it("bounds one attempt at 60 s and lets the SDK retry transport once", () => {
    envMock.ANTHROPIC_API_KEY = "sk-test";
    const client = createAnthropicClient();

    expect(AI_REQUEST_TIMEOUT_MS).toBe(60_000);
    expect(AI_MAX_RETRIES).toBe(1);
    expect(client.timeout).toBe(60_000);
    expect(client.maxRetries).toBe(1);
  });

  it("throws MissingApiKeyError when the key is unset", () => {
    envMock.ANTHROPIC_API_KEY = undefined;
    expect(() => createAnthropicClient()).toThrow(MissingApiKeyError);
  });
});
