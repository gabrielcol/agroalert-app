import "server-only";

import { TRPCError } from "@trpc/server";

import { env } from "@/env";

/**
 * Minimal in-memory fixed-window rate limiter for a single Node process (a
 * process-local counter — there is no multi-instance fan-out to coordinate).
 * Use it to bound abusive tRPC mutations that better-auth's rate limiting
 * (auth endpoints only) does not cover. Swap for a shared store (e.g. Redis)
 * when running more than one instance.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Record a hit against `key` and report whether it is within `max` per
 * `windowMs`. Pure and deterministic given `now` (injected for tests).
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    // Opportunistically evict expired buckets so the map can't grow unbounded
    // under a churn of distinct keys (IPs / session ids).
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(k);
      }
    }
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }
  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: max - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Throw `TOO_MANY_REQUESTS` if `key` exceeds `max` per `windowMs`. No-op under
 * the test environment so the shared-context unit tests (which all share one
 * ip/session) don't cross-contaminate — the limiter itself is unit-tested
 * directly via {@link rateLimit}.
 */
export function enforceRateLimit(
  key: string,
  max: number,
  windowMs: number,
): void {
  if (env.NODE_ENV === "test") return;
  const result = rateLimit(key, max, windowMs);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests — please slow down.",
    });
  }
}

/** Test-only: clear all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
}
