---
status: Done
branch: fix/haiku-crops-step
created: 2026-09-13
---

# Haiku crops step: smaller output, forgiving parse, readable failures

## Description

With `AI_MODEL=claude-haiku-4-5` in the container (the issue 0018 follow-up), the
`[recommendation]` lines on the box read:

```
{"kind":"crops",...,"totalMs":52433,"attempts":1,"modelMs":[52420],"stopReasons":["tool_use"],"errorName":null}
{"kind":"crops",...,"totalMs":49876,"attempts":1,"modelMs":[49872],"stopReasons":["tool_use"],"errorName":null}
{"kind":"varieties",...,"totalMs":13780,"attempts":1,"modelMs":[13779],"stopReasons":["tool_use"],"errorName":null}
{"kind":"crops",...,"totalMs":59140,"attempts":2,"modelMs":[33683,25451],"stopReasons":["tool_use","tool_use"],"errorName":"AiOutputError"}
tRPC error { path: 'recommendation.crops', message: 'AI_INVALID_OUTPUT', cause: { name: 'AiOutputError', message: 'The recommend_crops output failed validation.' } }
```

Diagnosis (read from the code on `main`, 2026-09-13):

- **The 30–60 s is output volume, not a timeout.** Every attempt ended with
  `stop_reason: "tool_use"`, inside the 60 s bound. The crops prompt asks for the top 3
  crops (up to 5 reasons + 5 risks each) **plus one Romanian sentence for every other
  dictionary crop under `excluded`** — 19 entries on 2026-09-13 — about 2–3k output tokens
  of Romanian JSON, which Haiku writes in 30–60 s non-streaming. The input (~30k tokens,
  the whole Crop Dictionary) is prompt-cached; that is why varieties takes 14 s.
- **`max_tokens` is not the cause**: 8000 was never hit (no `max_tokens` stop reason). It
  is raised anyway as insurance.
- **The validation failure is invisible by design.** The Zod issues are fed back to the
  model on the retry but appear neither in the `[recommendation]` line (only `errorName`)
  nor in `ai_call.errorMessage` (the constant message). Only `ai_call.rawResponse` holds
  the bad payload.
- **The model gets no schema hints.** No field descriptions reach the JSON schema and the
  tool is not `strict`. The constraints Haiku most plausibly breaks: `fit` must be an
  integer, `reasons`/`risks` at most 5, `top` at most 3, `risks` and
  `recommendedVarietyIds` required even when empty, `cropId` an exact dictionary id.

Decisions (agreed with the user, 2026-09-13):

- **Shrink the output.** The model writes `excluded` reasons only for **candidate** crops
  it leaves out of the top list. The server fills every non-candidate crop into
  `excluded` with a templated Romanian reason derived from the candidate rule (next
  sowing window). The stored `CropRecommendation` contract and the cultura screen are
  unchanged.
- **Forgiving parse before Zod.** `fit` is rounded and clamped to 0..100, `reasons` /
  `risks` / `recommendedVarietyIds` are cut to 5, `top` to 3, and a missing `risks` /
  `recommendedVarietyIds` defaults to `[]`. An unknown `cropId` stays a hard failure (the
  0018 correction retry handles it).
- **Schema hints.** Field descriptions on the recommendation schema reach the tool's
  JSON schema. `strict: true` only if verified live against Haiku; otherwise descriptions
  only, stated in the changelog. **Outcome:** verified live on 2026-09-13 against
  `claude-haiku-4-5` with the frozen Reviga brief — strict accepted, output validated
  first try, crops 18–22 s warm (35 s cold, paying the cache write), varieties 17 s.
- **`max_tokens` 8000 → 16000**; the 60 s per-attempt timeout stays.
- **Diagnosable failures.** The Zod issues (JSON, truncated) go in the
  `[recommendation]` line (`issues`, `null` when none) and in `ai_call.errorMessage`.
- New issue, branch off `main`; issue 0019 (eval dataset) is parked meanwhile.

## Acceptance criteria

- [x] The crops user turn and the tool description ask for `excluded` entries only for
      candidate crops left out of the top list; non-candidate crops are no longer requested.
- [x] After the model answers, every dictionary crop not in `top` appears in `excluded`
      exactly once: the model's entries first, then the candidate-rule demotions, then the
      server-filled non-candidates with a Romanian reason naming the next sowing window.
- [x] `parseToolInput` normalises the crops payload before Zod: non-integer / out-of-range
      `fit`, over-long `reasons` / `risks` / `recommendedVarietyIds`, more than 3 `top`
      entries and missing `risks` / `recommendedVarietyIds` all parse; an unknown
      `cropId` still fails. The varieties payload gets the same `fit` / `reasons` care.
- [x] The generated tool JSON schema carries a `description` per field.
- [x] `max_tokens` is 16000 on both calls.
- [x] The `[recommendation]` line carries `issues` (per-attempt truncated Zod issues, or
      `null`), and `ai_call.errorMessage` of an `AiOutputError` row includes the issues.
- [x] Unit tests cover the normalisation, the server-filled `excluded` list and the log
      line; one Playwright spec is written (not run — pre-deploy suite).
- [x] README, `.env.example` and STATUS say `AI_MODEL` may be `claude-haiku-4-5` or a
      Sonnet/Opus id; CHANGELOG entry with datetime and branch.
