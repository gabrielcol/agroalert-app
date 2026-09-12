---
status: In Progress
branch: feat/ai-call-log
created: 2026-09-13
---

# Log every AI call with raw response, tokens and model

## Description

The two Claude calls (`recommendCrops`, `rankVarieties` in `src/lib/ai/recommend.ts`)
leave no trace beyond the validated `result` stored on `CropRecommendation` /
`VarietyRecommendation`. For cost tracking and debugging we need one persisted row per
call to the Anthropic API, holding the raw SDK response, and, as separate columns, the
model that answered and the input / output token counts (plus cache read / creation
tokens, which the SDK reports separately).

Decisions (asked 2026-09-13):

- Log target: a new Prisma model `AiCall` (table `ai_call`), no console line.
- Failed calls are logged too: `status` `ok` | `error`, `errorName`, `errorMessage`;
  token columns and `rawResponse` are filled whenever the API returned a message
  (e.g. the model answered but the tool output failed validation).
- Only the raw response is stored, not the request. The prompt is reproducible from the
  stored Weather Brief, the Field Profile and the prompt code.
- Rows link to what they produced via nullable `cropRecommendationId` /
  `varietyRecommendationId`, set by the router after it persists the result; they also
  carry `fieldProfileId` and `kind` (`crops` | `varieties`).

## Acceptance criteria

- [ ] `prisma/schema.prisma` has `model AiCall` with: `id`, `createdAt`, `kind`,
      `fieldProfileId`, `model` (requested), `responseModel` (from the response, nullable),
      `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`
      (all nullable Int), `durationMs`, `status`, `errorName`, `errorMessage`,
      `rawResponse` (nullable Json), `cropRecommendationId`, `varietyRecommendationId`
      (nullable, indexed). A migration is committed.
- [ ] Every `messages.create` call in `src/lib/ai/recommend.ts` produces exactly one
      `ai_call` row, whether it succeeds, the API throws, or the output fails validation.
- [ ] A successful `recommendation.crops` / `recommendation.varieties` procedure ends with
      the row's `cropRecommendationId` / `varietyRecommendationId` pointing at the created
      recommendation.
- [ ] The `ai_call` write never breaks the recommendation: a failing log write is caught and
      reported with `console.error`, the recommendation still returns.
- [ ] Unit tests (Vitest) cover: the row shape on success, on API error, on invalid output;
      the router linking the row. An e2e spec is written (not run, pre-deploy only).
- [ ] Gate green: typecheck, lint, prettier, Vitest.
