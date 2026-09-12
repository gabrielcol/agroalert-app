---
status: In Progress
branch: feat/crop-variety-recommendation
created: 2026-09-12
---

# Crop and Variety Recommendation: Claude call, cultura and soi steps

## Description

The `cultura` and `soi` steps currently render `SAMPLE_PLANS` mock choice cards. This
issue makes the Claude call real: a Crop Recommendation for the `cultura` step and a
Variety Recommendation for the `soi` step, both validated against the frozen output
contracts from issue 0003, both grounded in the compact Crop Dictionary and the Weather
Brief from issue 0005.

**Branches off `main` only after issue 0003 has merged.** Files are disjoint from issues
0004 and 0005: this issue owns `src/lib/ai/*`, the recommendation router, `cultura-screen.tsx`,
`soi-screen.tsx`, and their i18n keys only.

## Scope

**In**

- Anthropic SDK used server-side only (never from the client), model id from `AI_MODEL`
  (Sonnet-class, per issue 0003's env work).
- Structured output enforced via tool-use with a JSON schema matching the frozen Crop
  Recommendation / Variety Recommendation output types exactly — no free-text parsing.
- The compact Crop Dictionary (built by issue 0003's strip script) placed in a
  prompt-cached block.
- Prompt instructions include: today's date, the 46-day candidate rule (a Crop's Sowing
  Window is a candidate only if it is open now or opens within the Seasonal Outlook
  horizon), and an instruction to answer `reasons`/`risks` in Romanian.
- `recommendation.crops(fieldProfileId)`: fetches the Weather Brief (via `weather.brief`,
  issue 0005), calls Claude, validates the output against the Zod schema, stores a
  `CropRecommendation` row with the Weather Brief snapshot and `modelId`, returns it.
- `cultura` step reads the stored Crop Recommendation by field-profile id: top 3
  `ChoiceCard`s with `fit` + two reasons (per the `ReasonList` component from issue
  0001), a "Recommended" badge on rank 1, and an "Alte culturi" collapsible listing
  `excluded` crops with their reasons.
- `recommendation.varieties(cropRecommendationId, cropId)`: second Claude call scoped to
  the chosen Crop, ranking every Variety of that Crop in the Crop Dictionary; stores a
  `VarietyRecommendation` row.
- `soi` step reads the stored Variety Recommendation and shows the full ranking.
- A retry screen (shadcn) shown when `weather.brief` or either recommendation call
  throws — no degraded output, per ADR 0003.

**Out**

- Any change to the Weather Brief aggregation itself (issue 0005) or to Field Location /
  teren (issue 0004).
- Streaming the model response — a single structured call/response per step is enough
  for the pitch.
- Any UI component library other than shadcn (AGENTS.md rule 7) — new cards reuse
  `ChoiceCard`/`ReasonList` from issue 0001 where the shape fits; a genuinely new
  component (e.g. the "Alte culturi" collapsible, the retry screen) is a shadcn
  component.

## Acceptance criteria

- [ ] `recommendation.crops` calls Claude with the compact Crop Dictionary in a
      prompt-cached block and the Weather Brief in the same request, and validates the
      response against the Crop Recommendation Zod schema before storing or returning it.
- [ ] Only Crops whose Sowing Window is open now or opens within the Seasonal Outlook
      horizon (today + 46 days) are eligible as one of the top 3; a Crop failing that
      rule appears in `excluded` with a reason, never in the top 3.
- [ ] `CropRecommendation` is persisted with the Weather Brief snapshot and `modelId`
      used for that call.
- [ ] The `cultura` step renders exactly 3 `ChoiceCard`s from the stored recommendation,
      each with `fit` and its `reasons` via `ReasonList`, rank 1 carrying a "Recommended"
      badge, and an "Alte culturi" collapsible listing every `excluded` crop with its
      reason.
- [ ] `recommendation.varieties` calls Claude scoped to the chosen crop, ranks every
      Variety of that Crop present in the Crop Dictionary (none omitted, none invented),
      and validates against the Variety Recommendation Zod schema before storing.
- [ ] The `soi` step renders the full ranked list from the stored Variety Recommendation.
- [ ] A thrown `weather.brief` or recommendation error surfaces a retry screen on both
      `cultura` and `soi`, with no partial/mock fallback rendered.
- [ ] Every `reasons`/`risks` string is Romanian.
- [ ] RO/EN parity for all new static copy (badge, collapsible label, retry screen).

## Tests required

- **Vitest**: unit tests with a mocked Anthropic client returning both a well-formed and
  a malformed tool-use payload (schema validation rejects the malformed one and surfaces
  a typed error, not a thrown parse exception); a fixture Weather Brief + Crop Dictionary
  slice producing a deterministic mocked response, asserting the 46-day candidate rule
  excludes a crop whose window opens on day 50; router tests for
  `recommendation.crops`/`recommendation.varieties` persisting the expected rows.
- **Playwright**: `e2e/cultura.spec.ts` / extend `e2e/agro.spec.ts` with mocked tRPC
  responses (no live Anthropic calls in CI) covering the 3-card + "Recommended" + "Alte
  culturi" render on `cultura`, the full ranking on `soi`, and the retry screen when the
  mocked call rejects. Written now; run pre-deploy per AGENTS.md rule 3 as amended.
- Both suites must pass locally before the PR opens.

## Dependencies

- Depends on issue 0003 (Zod output contracts, `CropRecommendation` /
  `VarietyRecommendation` models, recommendation router stubs, `ANTHROPIC_API_KEY` /
  `AI_MODEL` env, compact Crop Dictionary build script).
- Depends at runtime on issue 0005's `weather.brief` to have real data, but is
  file-disjoint from it and from issue 0004 — safe to develop in parallel with both once
  0003 is merged, integrating against 0005's stub or real implementation as it lands.
