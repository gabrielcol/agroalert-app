---
status: In Review
branch: fix/ai-call-timeout-and-retry
created: 2026-09-13
---

# AI call timeout, one output retry, self-explaining logs

## Description

On the deployed Docker build the wizard sometimes shows the retry screen ("Ceva nu a mers /
Nu am putut pregăti recomandarea") on the **first** attempt; the user's own retry then
succeeds. Model calls take over 40 s. The trace showed:

- `src/lib/ai/client.ts` builds the Anthropic client with no options, so the SDK defaults
  apply: a **10 minute** timeout with 2 retries. The app itself therefore cannot be what
  fails at 10–30 s — something in front of it (proxy, platform read timeout) is the likely
  culprit, but the cause is **unproven**: there is no shell access to the box today.
- Every AI failure collapses into one generic UI string; only `WEATHER_UNAVAILABLE` is told
  apart from the rest, so the logs say nothing about _which_ failure happened.
- `recommendation.crops` / `.varieties` are idempotent per profile, so a request cut off
  after the server finished still stores its row — which is exactly why the user's retry
  succeeds.

The fix has two halves: bound the call so the app fails on its own terms, and make the next
failure **self-explaining** so the cause stops being a guess.

Decisions (agreed with the user, 2026-09-13):

- Client options: **60 s timeout, 1 SDK retry** (`maxRetries: 1`). Worst case per step is
  therefore ≈ 60 s × 2 (SDK attempts) × 2 (correction attempts) ≈ 4 minutes.
- One **server-side correction retry**: when the model answers but the output fails
  validation, the bad turn and the validation issues are fed back to the model and it is
  asked once more. Both output shapes (`no_tool_use` prose and `invalid` arguments) and
  both steps (crops, varieties) are covered.
- `enforceCandidateRule` and `enforceVarietyCoverage` raise `AiOutputError` too, so **their
  failures are retried once as the "invalid" shape** — the model is told its arguments
  failed validation and asked to call the tool again.
- A `max_tokens` truncation is a distinct error (`AiOutputTruncatedError`) and is **not**
  retried: the same request would truncate again.
- API throws are **not** retried here; the SDK's own `maxRetries` covers them.
- One structured `[recommendation] {...}` log line per step, carrying the per-attempt trace.
- No UI copy change, no default-model change in code (the operator sets
  `AI_MODEL=claude-haiku-4-5` in the container env), no cultura pre-warm.

## Acceptance criteria

- [x] `createAnthropicClient()` builds the client with `timeout: 60_000` and
      `maxRetries: 1`; it still throws `MissingApiKeyError` when the key is unset.
- [x] `AiOutputTruncatedError extends AiOutputError` exists with its own `name`, is raised
      when the response `stop_reason` is `max_tokens`, and still maps to
      `AI_INVALID_OUTPUT` through the router's `toTRPCError` (no router change needed).
- [x] `AiCall` has an `attempt Int @default(1)` column with a committed migration, and
      `AiCallRecord.attempt` is persisted by the Prisma recorder.
- [x] The invariant holds: **exactly one `ai_call` row per Anthropic API call** — a retried
      step writes two rows, numbered `attempt: 1` and `attempt: 2`, and the returned
      `aiCallId` is the row of the call that produced the answer.
- [x] `recommendCrops` / `rankVarieties` retry **once** on `AiOutputError` (including the
      `enforceCandidateRule` / `enforceVarietyCoverage` failures) when a message was
      received, by replaying the failed assistant turn and answering every `tool_use` in it
      with a `tool_result` carrying `is_error: true` and the validation issues (capped at
      ~4000 characters); a prose answer with no tool call gets an extra text block telling
      the model to call the tool. The wrong tool is answered with "Wrong tool.".
- [x] The retry keeps `system` (with its `cache_control` breakpoint), `tools` and
      `tool_choice` unchanged, so attempt 2 reads the same cached prefix.
- [x] A truncated (`max_tokens`) answer is **not** retried and is logged with
      `errorName: "AiOutputTruncatedError"`. An API throw is **not** retried. A second
      failure rethrows, leaving two error rows.
- [x] Each recommendation step emits exactly one `console.log("[recommendation] " + JSON)`
      line: crops carries `kind, fieldProfileId, model, weatherBriefMs, totalMs, attempts,
modelMs[], stopReasons[], errorName`; varieties carries the same minus
      `weatherBriefMs`, plus `cropId`. A Weather Brief failure logs `attempts: 0`.
- [x] Unit tests (Vitest) cover: the client options and the missing key; the retry for both
      shapes and both steps; the tool_result content; the row numbering and the returned
      id; truncation not retried; an API throw not retried; the second failure rethrowing;
      the `attempt` column persisted; the log line for crops, varieties, an error and a
      weather failure; the truncated error mapping to `AI_INVALID_OUTPUT`.
- [x] An e2e spec (`e2e/ai-retry.spec.ts`) is written — **not run**; the Playwright suite
      runs before a deploy (AGENTS.md rule 3).
- [x] Gate green: typecheck, lint, prettier, Vitest.
- [x] `CHANGELOG.md`, `README.md`, `.env.example` and `STATUS.md` record the new timeout,
      the SDK retry and the correction retry.
