import {
  CROP_IDS,
  getCrop,
  isCropId,
  varietyNames,
} from "@/lib/agro/crop-dictionary";
import type {
  Confidence,
  CropRecommendation,
  VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import { candidateCropIds, qualifyingWindows } from "@/lib/ai/candidates";
import type { EvalCase } from "./case-schema";
import { hasMarkdown, looksRomanian } from "./romanian";

/**
 * The invariants of `evals/README.md` § "Invariants" and the `expect`
 * vocabulary, as pure `(result, case) => string[]` functions: empty means the
 * result holds, otherwise one readable sentence per broken constraint. The live
 * runner and the unit tests call the same code, so a failure a test can
 * reproduce is the failure the runner reported.
 *
 * Schema validity (invariant 1's first clause) is *not* re-checked here: the
 * result these functions are handed has already been parsed by
 * `cropRecommendationSchema` / `varietyRecommendationSchema` inside
 * `recommendCrops` / `rankVarieties`, which is where a malformed answer fails.
 */

/**
 * How far ahead a `sowingWindow` may reach. The candidate rule looks 46 days
 * ahead, but the window the model *proposes* is a whole dictionary window, so
 * the concrete occurrences are collected over a full year.
 */
const WINDOW_LOOKAHEAD_DAYS = 366;

const CONFIDENCE_RANK: Record<Confidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** Romanian plain text, non-empty, no markdown — invariant 3, per string. */
function textIssues(label: string, text: string): string[] {
  const issues: string[] = [];
  if (text.trim() === "") {
    issues.push(`${label} is empty`);
    return issues;
  }
  if (!looksRomanian(text)) {
    issues.push(`${label} is not Romanian plain text: "${text}"`);
  }
  if (hasMarkdown(text)) {
    issues.push(`${label} contains markdown: "${text}"`);
  }
  return issues;
}

/** Names that occur more than once in a list, each reported with its count. */
function duplicates(names: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return new Map([...counts].filter(([, count]) => count > 1));
}

/** `fit` strictly descending down a ranked list — invariant 4. */
function descendingIssues(
  label: string,
  entries: readonly { fit: number }[],
  nameOf: (index: number) => string,
): string[] {
  const issues: string[] = [];
  for (let i = 1; i < entries.length; i += 1) {
    if (entries[i].fit >= entries[i - 1].fit) {
      issues.push(
        `${label} fit is not strictly descending: ${nameOf(i - 1)} has ` +
          `${entries[i - 1].fit} and ${nameOf(i)} has ${entries[i].fit}`,
      );
    }
  }
  return issues;
}

export function cropInvariantIssues(
  result: CropRecommendation,
  c: EvalCase,
): string[] {
  const issues: string[] = [];
  const topIds = result.top.map((crop) => crop.cropId);
  const topSet = new Set<string>(topIds);

  // --- Invariant 1: dictionary ids, 1-3 top, complete `excluded` -----------
  if (result.top.length < 1 || result.top.length > 3) {
    issues.push(`top holds ${result.top.length} crops, expected 1-3`);
  }
  for (const id of [...topIds, ...result.excluded.map((e) => e.cropId)]) {
    if (!isCropId(id)) {
      issues.push(`"${id}" is not a Crop Dictionary id`);
    }
  }
  const excludedCounts = new Map<string, number>();
  for (const entry of result.excluded) {
    excludedCounts.set(
      entry.cropId,
      (excludedCounts.get(entry.cropId) ?? 0) + 1,
    );
  }
  for (const id of CROP_IDS) {
    const count = excludedCounts.get(id) ?? 0;
    if (topSet.has(id)) {
      if (count > 0) {
        issues.push(`"${id}" appears in both top and excluded`);
      }
      continue;
    }
    // Completed server-side by `completeExcluded` since issue 0020, so this is
    // asserted on the result the caller is handed, not on the raw tool call.
    if (count === 0) {
      issues.push(
        `dictionary crop "${id}" is missing from excluded; every non-top crop must appear exactly once`,
      );
    } else if (count > 1) {
      issues.push(`"${id}" appears ${count} times in excluded, expected once`);
    }
  }

  // --- Invariant 2: candidate rule and the sowing window ------------------
  const candidates = new Set(candidateCropIds(c.today));
  result.top.forEach((crop, index) => {
    const label = `top[${index}] ${crop.cropId}`;
    if (!isCropId(crop.cropId)) return;
    if (!candidates.has(crop.cropId)) {
      issues.push(`${label} is not a candidate on ${c.today}`);
    }
    const occurrences = qualifyingWindows(
      getCrop(crop.cropId),
      c.today,
      WINDOW_LOOKAHEAD_DAYS,
    );
    const { from, to } = crop.sowingWindow;
    const inside = occurrences.some(
      (occ) => occ.from <= from && to <= occ.to && from <= to,
    );
    if (!inside) {
      issues.push(
        `${label} sowingWindow ${from}..${to} lies outside every dictionary ` +
          `sowing window occurrence (${occurrences
            .map((occ) => `${occ.from}..${occ.to}`)
            .join(", ")})`,
      );
    }
  });

  // --- Invariant 3: Romanian plain text, real variety names ---------------
  result.top.forEach((crop, index) => {
    const label = `top[${index}] ${crop.cropId}`;
    crop.reasons.forEach((text, i) =>
      issues.push(...textIssues(`${label} reasons[${i}]`, text)),
    );
    crop.risks.forEach((text, i) =>
      issues.push(...textIssues(`${label} risks[${i}]`, text)),
    );
    if (!isCropId(crop.cropId)) return;
    const names = varietyNames(crop.cropId);
    for (const name of crop.recommendedVarietyIds) {
      if (!names.includes(name)) {
        issues.push(
          `${label} recommendedVarietyIds "${name}" is not a variety of ${crop.cropId}`,
        );
      }
    }
  });
  result.excluded.forEach((entry, index) =>
    issues.push(
      ...textIssues(`excluded[${index}] ${entry.cropId} reason`, entry.reason),
    ),
  );

  // --- Invariant 4: fit and confidence sanity ----------------------------
  issues.push(
    ...descendingIssues("top", result.top, (i) => `top[${i}] ${topIds[i]}`),
  );
  if (c.lowData) {
    result.top.forEach((crop, index) => {
      if (crop.confidence === "high") {
        issues.push(
          `top[${index}] ${crop.cropId} has confidence "high" but the case is flagged lowData`,
        );
      }
    });
  }

  return issues;
}

export function varietyInvariantIssues(
  result: VarietyRecommendation,
  c: EvalCase,
): string[] {
  const issues: string[] = [];

  if (c.cropId === undefined) {
    issues.push("case carries no cropId, so the ranking cannot be checked");
    return issues;
  }
  if (result.cropId !== c.cropId) {
    issues.push(
      `result cropId "${result.cropId}" does not equal the case cropId "${c.cropId}"`,
    );
  }
  if (!isCropId(c.cropId)) {
    issues.push(`case cropId "${c.cropId}" is not a Crop Dictionary id`);
    return issues;
  }

  // The ranking must cover exactly the crop's dictionary varieties: none
  // omitted, none invented, none twice.
  const expected = varietyNames(c.cropId);
  const ranked = result.ranked.map((entry) => entry.varietyName);
  for (const name of expected) {
    if (!ranked.includes(name)) {
      issues.push(`ranked omits the variety "${name}" of ${c.cropId}`);
    }
  }
  for (const name of ranked) {
    if (!expected.includes(name)) {
      issues.push(`ranked holds "${name}", not a variety of ${c.cropId}`);
    }
  }
  for (const [name, count] of duplicates(ranked)) {
    issues.push(`ranked holds "${name}" ${count} times, expected once`);
  }

  issues.push(
    ...descendingIssues(
      "ranked",
      result.ranked,
      (i) => `ranked[${i}] ${ranked[i]}`,
    ),
  );
  result.ranked.forEach((entry, index) =>
    entry.reasons.forEach((text, i) =>
      issues.push(
        ...textIssues(
          `ranked[${index}] ${entry.varietyName} reasons[${i}]`,
          text,
        ),
      ),
    ),
  );

  return issues;
}

/**
 * A result tagged with the kind of case it answers, so `expectIssues` can take
 * either shape: the crops keys apply to a `CropRecommendation`, the varieties
 * keys to a `VarietyRecommendation`.
 */
export type EvalResult =
  | { kind: "crops"; result: CropRecommendation }
  | { kind: "varieties"; result: VarietyRecommendation };

export function expectIssues(input: EvalResult, c: EvalCase): string[] {
  const issues: string[] = [];
  const expected = c.expect;
  if (expected === undefined) return issues;

  if (input.kind === "crops") {
    const { result } = input;
    const fitOf = new Map<string, number>(
      result.top.map((crop) => [crop.cropId, crop.fit]),
    );
    for (const id of expected.mustInclude ?? []) {
      if (!fitOf.has(id)) {
        issues.push(
          `expect.mustInclude "${id}" is not in top (${[...fitOf.keys()].join(", ")})`,
        );
      }
    }
    for (const id of expected.mustExclude ?? []) {
      if (fitOf.has(id)) {
        issues.push(`expect.mustExclude "${id}" is in top`);
      }
    }
    // Conditional: a pair bites only when both crops made the top list.
    for (const [a, b] of expected.fitOrder ?? []) {
      const fitA = fitOf.get(a);
      const fitB = fitOf.get(b);
      if (fitA === undefined || fitB === undefined) continue;
      if (!(fitA > fitB)) {
        issues.push(
          `expect.fitOrder ["${a}", "${b}"] broken: ${a} has fit ${fitA}, ${b} has ${fitB}`,
        );
      }
    }
    const cap = expected.maxConfidence;
    if (cap !== undefined) {
      for (const crop of result.top) {
        if (CONFIDENCE_RANK[crop.confidence] > CONFIDENCE_RANK[cap]) {
          issues.push(
            `expect.maxConfidence "${cap}" exceeded: ${crop.cropId} has confidence "${crop.confidence}"`,
          );
        }
      }
    }
    return issues;
  }

  const { result } = input;
  const fitOf = new Map<string, number>(
    result.ranked.map((entry) => [entry.varietyName, entry.fit]),
  );
  const topAny = expected.topAny;
  if (topAny !== undefined) {
    const first = result.ranked[0]?.varietyName;
    if (first === undefined || !topAny.includes(first)) {
      issues.push(
        `expect.topAny [${topAny.join(", ")}] broken: "${first ?? "(nothing)"}" ranked first`,
      );
    }
  }
  for (const [a, b] of expected.varietyOrder ?? []) {
    const fitA = fitOf.get(a);
    const fitB = fitOf.get(b);
    if (fitA === undefined || fitB === undefined) continue;
    if (!(fitA > fitB)) {
      issues.push(
        `expect.varietyOrder ["${a}", "${b}"] broken: ${a} has fit ${fitA}, ${b} has ${fitB}`,
      );
    }
  }
  return issues;
}

/** Invariants plus `expect`, for whichever kind the case is. */
export function allIssues(input: EvalResult, c: EvalCase): string[] {
  const invariants =
    input.kind === "crops"
      ? cropInvariantIssues(input.result, c)
      : varietyInvariantIssues(input.result, c);
  return [...invariants, ...expectIssues(input, c)];
}
