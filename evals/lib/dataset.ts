import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  briefFileSchema,
  evalCaseSchema,
  type BriefFile,
  type EvalCase,
} from "./case-schema";

/**
 * Reading the dataset off disk. Everything resolves from this module's own
 * location rather than the process working directory, so the same functions
 * work under Vitest (`bunx vitest run evals`) and under
 * `bun run evals/run.ts` started from anywhere.
 */

/** The `evals/` directory: this file lives in `evals/lib/`. */
export const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const CASES_DIR = join(EVALS_DIR, "cases");
export const BRIEFS_DIR = join(EVALS_DIR, "briefs");
/** Where the live runner writes its JSON reports (gitignored). */
export const RESULTS_DIR = join(EVALS_DIR, "results");

/**
 * A case as loaded: the file name without `.json` alongside the parsed case,
 * so the "file name equals id" check has something to compare against.
 */
export type LoadedCase = { file: string; case: EvalCase };

/** A brief as loaded: the file name without `.json` and the parsed wrapper. */
export type LoadedBrief = { file: string; data: BriefFile };

function jsonFileNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Parse, blaming the file: a raw Zod error does not say which one broke. */
function parseFile<T>(
  schema: { parse: (value: unknown) => T },
  path: string,
  value: unknown,
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path} does not parse: ${message}`);
  }
}

/** Every case under `evals/cases/`, in file-name order. */
export function loadCases(): LoadedCase[] {
  return jsonFileNames(CASES_DIR).map((name) => ({
    file: name.replace(/\.json$/, ""),
    case: parseFile(
      evalCaseSchema,
      join(CASES_DIR, name),
      readJson(join(CASES_DIR, name)),
    ),
  }));
}

/** Every brief under `evals/briefs/`, in file-name order. */
export function loadBriefs(): LoadedBrief[] {
  return jsonFileNames(BRIEFS_DIR).map((name) => ({
    file: name.replace(/\.json$/, ""),
    data: parseFile(
      briefFileSchema,
      join(BRIEFS_DIR, name),
      readJson(join(BRIEFS_DIR, name)),
    ),
  }));
}

/** One brief by slug. Throws when the file is missing: a case named it. */
export function loadBrief(slug: string): BriefFile {
  const path = join(BRIEFS_DIR, `${slug}.json`);
  return parseFile(briefFileSchema, path, readJson(path));
}

/** The briefs keyed by the slug a case references. */
export function briefsBySlug(
  briefs: readonly LoadedBrief[],
): Map<string, LoadedBrief> {
  return new Map(briefs.map((brief) => [brief.data.slug, brief]));
}

/** `evals/briefs/SUMMARY.md`, for the tests that assert it lists every brief. */
export function readBriefSummary(): string {
  return readFileSync(join(BRIEFS_DIR, "SUMMARY.md"), "utf8");
}

/** `evals/README.md`, for the test that asserts the coverage table is complete. */
export function readEvalsReadme(): string {
  return readFileSync(join(EVALS_DIR, "README.md"), "utf8");
}
