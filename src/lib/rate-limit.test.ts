// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { __resetRateLimits, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows up to `max` hits then blocks within the window", () => {
    const key = "k1";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 1000, 1000).allowed).toBe(true);
    }
    // 4th hit in the same window is blocked.
    expect(rateLimit(key, 3, 1000, 1000).allowed).toBe(false);
  });

  it("reports the remaining budget", () => {
    expect(rateLimit("k2", 5, 1000, 0).remaining).toBe(4);
    expect(rateLimit("k2", 5, 1000, 0).remaining).toBe(3);
  });

  it("resets after the window elapses", () => {
    expect(rateLimit("k3", 1, 1000, 0).allowed).toBe(true);
    expect(rateLimit("k3", 1, 1000, 500).allowed).toBe(false);
    // A hit at/after resetAt starts a fresh window.
    expect(rateLimit("k3", 1, 1000, 1000).allowed).toBe(true);
  });

  it("keys are independent", () => {
    expect(rateLimit("a", 1, 1000, 0).allowed).toBe(true);
    expect(rateLimit("a", 1, 1000, 0).allowed).toBe(false);
    // A different key has its own budget.
    expect(rateLimit("b", 1, 1000, 0).allowed).toBe(true);
  });
});
