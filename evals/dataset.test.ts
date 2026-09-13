// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isoDateSchema, weatherBriefSchema } from "@/lib/weather/schema";
import {
  loadBriefs,
  loadCases,
  readBriefSummary,
  readEvalsReadme,
} from "./lib/dataset";
import { staticIssues } from "./lib/static-checks";

/**
 * The dataset suite: it spends no model tokens and asserts only that `evals/`
 * is internally consistent, so a recapture, a dictionary rebuild or a hand edit
 * cannot quietly turn a case into a claim about nothing. The per-case checks
 * are the ones `evals/README.md` § "Validating the dataset" lists, implemented
 * in `evals/lib/static-checks.ts`.
 */

const briefs = loadBriefs();
const cases = loadCases();
const summary = readBriefSummary();
const readme = readEvalsReadme();

/** Frozen in issue 0019; a changed count is a decision, not an accident. */
const EXPECTED_BRIEFS = 9;
const EXPECTED_CASES = 26;
const EXPECTED_CROPS_CASES = 20;
const EXPECTED_VARIETIES_CASES = 6;

describe("briefs", () => {
  it(`has ${EXPECTED_BRIEFS} brief files`, () => {
    expect(briefs).toHaveLength(EXPECTED_BRIEFS);
  });

  it.each(briefs)("brief $file is internally consistent", ({ file, data }) => {
    expect(weatherBriefSchema.safeParse(data.brief).success).toBe(true);
    expect(data.slug).toBe(file);
    expect(isoDateSchema.safeParse(data.brief.today).success).toBe(true);
    if (data.kind === "synthetic") {
      // A synthetic brief may not be read for a trend, so it must say so.
      expect(data.notes?.trim() ?? "").not.toBe("");
    }
    expect(summary).toContain(file);
  });
});

describe("cases", () => {
  it(`has ${EXPECTED_CASES} case files`, () => {
    expect(cases).toHaveLength(EXPECTED_CASES);
  });

  it("splits into the frozen crops / varieties counts", () => {
    const byKind = (kind: string) =>
      cases.filter((entry) => entry.case.kind === kind).length;
    expect(byKind("crops")).toBe(EXPECTED_CROPS_CASES);
    expect(byKind("varieties")).toBe(EXPECTED_VARIETIES_CASES);
  });

  it("has unique ids", () => {
    const ids = cases.map((entry) => entry.case.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is listed case by case in the README coverage table", () => {
    const missing = cases
      .map((entry) => entry.case.id)
      .filter((id) => !readme.includes(`\`${id}\``));
    expect(missing).toEqual([]);
  });

  it.each(cases)("case $file passes every static check", (entry) => {
    expect(staticIssues(entry, briefs)).toEqual([]);
  });
});
