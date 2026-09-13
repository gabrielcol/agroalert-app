---
status: Todo
branch: fix/variety-screen-dedupe-blank-state
created: 2026-09-13
---

# Variety screen: dedupe the ranking, never render blank

## Description

Reported 2026-09-13: "the variety screen is empty". Diagnosis on `main` (after issue 0020) found two separate defects, neither caused by token limits (`max_tokens` went
8000 → 16000 and live output is 163–682 tokens):

- **Duplicate varieties.** `toStrictSchema` (`src/lib/ai/tools.ts`) drops `uniqueItems`
  from the JSON schema, `normalizeVarietyInput` does not dedupe and
  `enforceVarietyCoverage` (`src/lib/ai/recommend.ts`) only checks for _missing_ names.
  In 3 of 6 live Haiku 4.5 runs the model repeated a variety (e.g.
  `[Ursita, Voinic, Glosa, Otilia, Izvor, Izvor]`). The variety list in
  `src/components/agro/soi-screen.tsx` keys cards by `varietyName`, so the repeat
  collides React keys and marks two cards as selected.
- **Blank "not ready" state.** The skeleton in `soi-screen.tsx` is gated on `ready`
  (profile, rec and crop all present in the URL). When any is missing the query is
  disabled and nothing at all renders between the heading and the disabled CTA — no
  request is made, no error shown. This is the only path that produces a truly empty
  screen; AI failures render `RetryScreen` and an empty ranking renders a message.

## Acceptance criteria

- [ ] `enforceVarietyCoverage` (or a step before it) keeps only the first occurrence of
      each `varietyName`; the coverage check runs on the deduped list. Unit test covers a
      ranking with a repeated name.
- [ ] Variety cards use a key that cannot collide even if a duplicate slips through.
- [ ] When `profile`, `rec` or `crop` is missing from the soi URL the screen shows a
      visible state (skeleton, or a message with a way back to the previous step) — never
      a blank area. Unit test renders the screen without params and asserts visible text.
- [ ] Playwright spec written (not run: pre-deploy pass) for the missing-param state.
- [ ] Gate green: typecheck, lint, prettier, Vitest. CHANGELOG entry with datetime and
      branch.
