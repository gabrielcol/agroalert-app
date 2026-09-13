---
status: Done
branch: feat/ai-eval-runner
created: 2026-09-13
---

# AI eval test suite: static dataset checks and an opt-in live runner

## Description

Issue 0019 delivered `evals/` — nine frozen Weather Briefs, 26 hand-authored cases and the
invariants in `evals/README.md` — with **no runner**. Nothing validates that the dataset is
internally consistent, and nothing executes a case against the model. Every claim in the
folder is still a claim, not a measurement.

This task makes both real, under `evals/` so the dataset stays self-contained:

1. **Static dataset suite** (`evals/dataset.test.ts`, runs in `bun run test`, zero model
   tokens). One test per brief (parses with `weatherBriefSchema`, slug matches the file,
   synthetic briefs carry `notes`, `SUMMARY.md` lists it) and one per case running every
   check from README § "Validating the dataset": file name equals `id`, the brief exists
   and its `today` matches, `profile.lat/lng` equal the brief location, the profile parses
   with `fieldProfileSchema`, `lowData` iff `soilClass` is `unknown` (and then a
   `maxConfidence`), every crop id is in the Crop Dictionary, every asserted id is a
   candidate on `today`, include/exclude are disjoint and satisfiable, variety names are
   real, and the kind-specific keys are the right ones.
2. **Assertion library** (`evals/lib/assertions.ts`, pure): the four crop invariants, the
   variety invariants and the `expect` vocabulary (`mustInclude`, `mustExclude`,
   `fitOrder`, `maxConfidence`, `topAny`, `varietyOrder`) as `(result, case) => string[]`,
   with a lenient Romanian-text heuristic. Unit-tested against the recommendation
   fixtures.
3. **Live runner** (`evals/run.ts`, `bun run eval`). Opt-in: exits with a hint when
   `ANTHROPIC_API_KEY` is unset. Calls `recommendCrops` / `rankVarieties` from
   `src/lib/ai/recommend.ts` directly (not the service: it pulls in `@/env`, the database
   and `server-only`) with the frozen brief, the case date and a dummy Field Profile.
   Prints one PASS/FAIL line per case with the failed constraints and the case
   `rationale`, a tally, and writes a JSON report to `evals/results/` (gitignored).
   `--filter`, `--kind`, `--model`, `--concurrency` flags.

The dataset predates issue 0020 (the `excluded` list is now completed server-side by
`completeExcluded`), so invariant 1 — every non-top dictionary crop under `excluded`
exactly once — is asserted on the parsed result, which still satisfies it.

**First baseline.** `bun run eval --model claude-haiku-4-5` on 2026-09-13: 12/26 passed
(8/20 crop, 4/6 variety). The failures are model behaviour, not harness bugs: soil-excluded
crops in the top (12), `high` confidence on low-data cases (4), duplicate variety names in
`ranked` (3), a `mustInclude` crop missing (4), one merged sowing window, two fit orderings.

**Test note.** Vitest covers the static suite and the pure assertion/static-check
functions. **e2e exemption** (AGENTS.md rule 3): no route, procedure or component changes;
this is developer tooling with no runtime surface.

## Acceptance criteria

- [x] `bun run test` runs `evals/dataset.test.ts`: 9 briefs and 26 cases pass the static
      checks; a deliberately broken case (wrong `today`, non-candidate id, invented
      variety) fails with a readable message.
- [x] `evals/lib/assertions.ts` implements the README invariants and every `expect` key;
      unit tests cover each function with mutated fixtures.
- [x] `bun run eval` with no API key exits 2 with a hint and makes no call; with a key it
      runs the selected cases, prints per-case results and a tally, writes
      `evals/results/<timestamp>-<model>.json` and exits 1 on any failure.
- [x] `evals/README.md` no longer says "there is no runner" and documents the test file
      and `bun run eval`.
- [x] Gate green: `bun run typecheck`, `bun run lint`, `bunx prettier --check .`,
      `bun run test`.
