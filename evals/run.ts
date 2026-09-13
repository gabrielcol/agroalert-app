import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import { isCropId } from "@/lib/agro/crop-dictionary";
import type { FieldProfile } from "@/lib/agro/field-profile";
import type {
  CropRecommendation,
  VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import {
  rankVarieties,
  recommendCrops,
  type AttemptTrace,
  type MessagesClient,
} from "@/lib/ai/recommend";
import { allIssues } from "./lib/assertions";
import type { EvalKind } from "./lib/case-schema";
import {
  briefsBySlug,
  loadBriefs,
  loadCases,
  RESULTS_DIR,
  type LoadedBrief,
  type LoadedCase,
} from "./lib/dataset";
import { staticIssues } from "./lib/static-checks";

/**
 * The live eval runner (`bun run eval`): it calls Claude on the frozen cases in
 * `evals/cases/` and reports, per case, which invariant or `expect` constraint
 * broke, with the case's `rationale` as the explanation of why it should have
 * held. Opt-in, because it spends tokens — no key, no run.
 *
 * It deliberately does NOT go through `src/lib/ai/service.ts`: that module
 * pulls in `@/env`, the database and `client.ts`'s `server-only` guard, none of
 * which belong in a CLI. `recommendCrops` / `rankVarieties` take the client as
 * an argument precisely so a harness can supply its own.
 */

/** The model the dataset was last exercised against (see STATUS.md). */
const DEFAULT_MODEL = "claude-haiku-4-5";
/** Two calls in flight keeps a hackathon-tier rate limit comfortable. */
const DEFAULT_CONCURRENCY = 2;
/** Same values as `src/lib/ai/client.ts`, so the run mirrors production. */
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;

const USAGE = `Usage: bun run eval [--filter <substring>] [--kind crops|varieties]
                   [--model <id>] [--concurrency <n>]`;

export type EvalArgs = {
  /** Substring match on the case id; null runs every case. */
  filter: string | null;
  kind: EvalKind | null;
  /** null means `AI_MODEL`, then the default. */
  model: string | null;
  concurrency: number;
};

/** Throws on an unknown flag or a missing value: a typo must not run 26 cases. */
export function parseArgs(argv: readonly string[]): EvalArgs {
  const args: EvalArgs = {
    filter: null,
    kind: null,
    model: null,
    concurrency: DEFAULT_CONCURRENCY,
  };
  const valueOf = (index: number, flag: string): string => {
    const value = argv[index];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} needs a value.\n${USAGE}`);
    }
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    switch (flag) {
      case "--filter":
        args.filter = valueOf(i + 1, flag);
        i += 1;
        break;
      case "--kind": {
        const value = valueOf(i + 1, flag);
        if (value !== "crops" && value !== "varieties") {
          throw new Error(`--kind must be crops or varieties, got "${value}".`);
        }
        args.kind = value;
        i += 1;
        break;
      }
      case "--model":
        args.model = valueOf(i + 1, flag);
        i += 1;
        break;
      case "--concurrency": {
        const value = Number(valueOf(i + 1, flag));
        if (!Number.isInteger(value) || value < 1) {
          throw new Error(`--concurrency must be a positive integer.`);
        }
        args.concurrency = value;
        i += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument "${flag}".\n${USAGE}`);
    }
  }
  return args;
}

/** What one case did, as the console line and the JSON report both read it. */
export type CaseOutcome = {
  id: string;
  kind: EvalKind;
  ok: boolean;
  /** Static-check failures, broken invariants and broken `expect` keys. */
  issues: string[];
  durationMs: number;
  /** One entry per API call, including the correction retry (issue 0018). */
  attempts: AttemptTrace[];
  /** The case's own explanation of why its constraints should have held. */
  rationale: string;
  /** Set when the call itself failed (`AiOutputError`, a timeout, …). */
  error: { name: string; message: string } | null;
  result: CropRecommendation | VarietyRecommendation | null;
};

export type RunCaseArgs = {
  client: MessagesClient;
  model: string;
  entry: LoadedCase;
  briefs: readonly LoadedBrief[];
};

/**
 * One case end to end: static checks, the model call(s), then the invariants
 * and the case's `expect`. A case that fails the static checks never reaches
 * the model — a broken case would otherwise buy a meaningless measurement — and
 * a call that throws is reported as that case's failure rather than ending the
 * run.
 */
export async function runCase(args: RunCaseArgs): Promise<CaseOutcome> {
  const c = args.entry.case;
  const startedAt = performance.now();
  const base = {
    id: c.id,
    kind: c.kind,
    rationale: c.rationale,
    attempts: [] as AttemptTrace[],
    error: null,
    result: null,
  };

  const staticFailures = staticIssues(args.entry, args.briefs);
  if (staticFailures.length > 0) {
    return { ...base, ok: false, issues: staticFailures, durationMs: 0 };
  }

  const brief = briefsBySlug(args.briefs).get(c.brief);
  if (brief === undefined) {
    // Unreachable: the static checks above already require the file.
    return {
      ...base,
      ok: false,
      issues: [`brief "${c.brief}" is missing`],
      durationMs: 0,
    };
  }

  const profile: FieldProfile = {
    ...c.profile,
    id: `eval-${c.id}`,
    createdAt: new Date(`${c.today}T00:00:00Z`),
  };
  const attempts: AttemptTrace[] = [];
  const call = {
    client: args.client,
    model: args.model,
    profile,
    brief: brief.data.brief,
    today: c.today,
    onAttempt: (trace: AttemptTrace) => attempts.push(trace),
  };

  try {
    if (c.kind === "crops") {
      const { result } = await recommendCrops(call);
      const issues = allIssues({ kind: "crops", result }, c);
      return {
        ...base,
        attempts,
        ok: issues.length === 0,
        issues,
        durationMs: Math.round(performance.now() - startedAt),
        result,
      };
    }

    if (c.cropId === undefined || !isCropId(c.cropId)) {
      return {
        ...base,
        ok: false,
        issues: [`cropId "${c.cropId}" is not a Crop Dictionary id`],
        durationMs: 0,
      };
    }
    // The crops call first, so the run mirrors what the product does before it
    // ever ranks varieties (and so a slow or failing first step shows up here).
    await recommendCrops(call);
    const { result } = await rankVarieties({ ...call, cropId: c.cropId });
    const issues = allIssues({ kind: "varieties", result }, c);
    return {
      ...base,
      attempts,
      ok: issues.length === 0,
      issues,
      durationMs: Math.round(performance.now() - startedAt),
      result,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : typeof error;
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      attempts,
      ok: false,
      issues: [`${name}: ${message}`],
      durationMs: Math.round(performance.now() - startedAt),
      error: { name, message },
    };
  }
}

/** `PASS crops-reviga-… (12.3s, 1 attempt)`, plus the issues when it failed. */
export function formatOutcome(outcome: CaseOutcome): string {
  const seconds = (outcome.durationMs / 1000).toFixed(1);
  const calls = outcome.attempts.length;
  const attempts = `${calls} ${calls === 1 ? "attempt" : "attempts"}`;
  const head = `${outcome.ok ? "PASS" : "FAIL"} ${outcome.id} (${seconds}s, ${attempts})`;
  if (outcome.ok) return head;
  return [
    head,
    ...outcome.issues.map((issue) => `    - ${issue}`),
    `    rationale: ${outcome.rationale}`,
  ].join("\n");
}

/** Run `worker` over `items` with at most `limit` in flight, in order. */
async function pool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const take = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, take),
  );
  return results;
}

/** `evals/results/2026-09-13T11-40-02.123Z-claude-haiku-4-5.json`. */
function reportPath(model: string): string {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return join(RESULTS_DIR, `${stamp}-${model}.json`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const model = args.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    console.error(
      "ANTHROPIC_API_KEY is not set, so no case can run.\n" +
        "Put it in .env (bun loads it) or pass it inline:\n" +
        "  ANTHROPIC_API_KEY=sk-ant-… bun run eval --filter reviga --kind crops\n" +
        "The dataset itself is checked without a key by `bun run test`.",
    );
    process.exit(2);
  }

  const briefs = loadBriefs();
  const selected = loadCases().filter(
    (entry) =>
      (args.kind === null || entry.case.kind === args.kind) &&
      (args.filter === null || entry.case.id.includes(args.filter)),
  );
  if (selected.length === 0) {
    console.error(
      `No case matched --kind ${args.kind ?? "any"} --filter ${args.filter ?? "none"}.`,
    );
    process.exit(1);
  }

  const client: MessagesClient = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });

  console.log(
    `Running ${selected.length} case(s) on ${model}, concurrency ${args.concurrency}.`,
  );
  const startedAt = new Date();
  const outcomes = await pool(selected, args.concurrency, async (entry) => {
    const outcome = await runCase({ client, model, entry, briefs });
    // Printed as each case finishes, so a long run is readable while it runs.
    console.log(formatOutcome(outcome));
    return outcome;
  });

  const passed = outcomes.filter((outcome) => outcome.ok).length;
  console.log(`\n${passed}/${outcomes.length} passed`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const path = reportPath(model);
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        model,
        args,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        total: outcomes.length,
        passed,
        results: outcomes,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Report: ${path}`);

  if (passed !== outcomes.length) process.exit(1);
}

// Only when run as a script: importing this module (the unit test does) must
// not start a run. `import.meta.main` is Bun's entry-point flag; it is absent
// under Vitest, which is exactly the guard we want.
const isEntryPoint =
  (import.meta as ImportMeta & { main?: boolean }).main === true;
if (isEntryPoint) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
