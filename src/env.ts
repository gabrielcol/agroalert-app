import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment variables. Fails fast at build/boot when a
 * required variable is missing. Imported in next.config.ts so validation runs
 * during `next build`. Set SKIP_ENV_VALIDATION=1 to bypass (e.g. Docker/CI).
 */
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    // ≥32 chars: this secret signs session tokens. better-auth only *warns*
    // below 32 chars, so a trivially weak secret would otherwise pass both
    // checks and undermine session-token integrity. Generate with
    // `openssl rand -base64 32` (see .env.example).
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // Comma-separated user ids granted admin access regardless of stored role
    // (bootstrap — see better-auth admin plugin `adminUserIds`).
    ADMIN_USER_IDS: z.string().optional(),
    // Crop / Variety Recommendation (issue 0006) — Anthropic API, server only.
    // Optional at boot so `bun dev` and the Playwright web server start without
    // a key; the recommendation call itself fails with MissingApiKeyError.
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    // Sonnet-class by default (Claude Sonnet 5); override to A/B during demos.
    AI_MODEL: z.string().min(1).default("claude-sonnet-5"),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
