import {
  isCropId,
  varietyNames,
  type CropId,
} from "@/lib/agro/crop-dictionary";
import { fieldProfileSchema } from "@/lib/agro/field-profile";
import { candidateCropIds } from "@/lib/ai/candidates";
import type { EvalCase } from "./case-schema";
import { briefsBySlug, type LoadedBrief, type LoadedCase } from "./dataset";

/**
 * Every check from `evals/README.md` § "Validating the dataset", as one pure
 * function. They are all static — no model tokens — and they catch the mistakes
 * that make a case *meaningless* rather than merely wrong: a date that has
 * drifted from its brief, a crop the candidate rule already excludes, a variety
 * name that does not exist. `evals/dataset.test.ts` runs them over the whole
 * folder and the live runner runs them per case before it spends a call.
 *
 * Returns human-readable sentences naming the offending value; empty means pass.
 */

/** At most this many crops may be asserted into `top`, which holds 1-3. */
const MAX_MUST_INCLUDE = 3;

/** A crop id as some case key writes it, with the key for the message. */
type CropIdRef = { path: string; id: string };
/** A variety name as some case key writes it, with the key for the message. */
type VarietyRef = { path: string; name: string };

function cropIdRefs(c: EvalCase): CropIdRef[] {
  const refs: CropIdRef[] = [];
  if (c.cropId !== undefined) refs.push({ path: "cropId", id: c.cropId });
  c.expect?.mustInclude?.forEach((id, i) =>
    refs.push({ path: `expect.mustInclude[${i}]`, id }),
  );
  c.expect?.mustExclude?.forEach((id, i) =>
    refs.push({ path: `expect.mustExclude[${i}]`, id }),
  );
  c.expect?.fitOrder?.forEach((pair, i) =>
    pair.forEach((id, j) =>
      refs.push({ path: `expect.fitOrder[${i}][${j}]`, id }),
    ),
  );
  return refs;
}

function varietyRefs(c: EvalCase): VarietyRef[] {
  const refs: VarietyRef[] = [];
  c.expect?.topAny?.forEach((name, i) =>
    refs.push({ path: `expect.topAny[${i}]`, name }),
  );
  c.expect?.varietyOrder?.forEach((pair, i) =>
    pair.forEach((name, j) =>
      refs.push({ path: `expect.varietyOrder[${i}][${j}]`, name }),
    ),
  );
  return refs;
}

/** The `expect` keys that belong to one kind of case and not the other. */
const KIND_ONLY_KEYS = {
  crops: ["topAny", "varietyOrder"],
  varieties: ["mustInclude", "mustExclude", "fitOrder"],
} as const;

export function staticIssues(
  entry: LoadedCase,
  briefs: readonly LoadedBrief[],
): string[] {
  const issues: string[] = [];
  const c = entry.case;

  if (entry.file !== c.id) {
    issues.push(
      `file name "${entry.file}.json" does not match id "${c.id}"; they must be equal`,
    );
  }

  const brief = briefsBySlug(briefs).get(c.brief);
  if (brief === undefined) {
    // Without the brief there is nothing to compare the date or the location
    // to, so the checks that need it are skipped rather than guessed at.
    issues.push(`brief "${c.brief}" is not a file under evals/briefs/`);
  } else {
    const frozen = brief.data.brief;
    if (frozen.today !== c.today) {
      issues.push(
        `today "${c.today}" does not equal brief "${c.brief}" today "${frozen.today}"`,
      );
    }
    if (c.profile.lat !== frozen.location.lat) {
      issues.push(
        `profile.lat ${c.profile.lat} does not equal brief "${c.brief}" location lat ${frozen.location.lat}`,
      );
    }
    if (c.profile.lng !== frozen.location.lng) {
      issues.push(
        `profile.lng ${c.profile.lng} does not equal brief "${c.brief}" location lng ${frozen.location.lng}`,
      );
    }
  }

  // The stored-record schema wants an `id` and a `createdAt` a case does not
  // carry; compose the dummies the runner composes.
  const profile = fieldProfileSchema.safeParse({
    ...c.profile,
    id: `eval-${c.id}`,
    createdAt: new Date(`${c.today}T00:00:00Z`),
  });
  if (!profile.success) {
    const detail = profile.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    issues.push(`profile does not parse with fieldProfileSchema: ${detail}`);
  }

  const unknownSoil = c.profile.soilClass === "unknown";
  if (c.lowData !== unknownSoil) {
    issues.push(
      `lowData is ${c.lowData} but profile.soilClass is "${c.profile.soilClass}"; ` +
        `lowData must be true exactly when the soil class is "unknown"`,
    );
  }
  if (c.lowData && c.expect?.maxConfidence === undefined) {
    issues.push(
      `lowData case carries no expect.maxConfidence; an unknown soil class must cap confidence`,
    );
  }

  if (c.title.trim() === "") issues.push("title is empty");
  if (c.rationale.trim() === "") issues.push("rationale is empty");

  for (const key of KIND_ONLY_KEYS[c.kind]) {
    if (c.expect?.[key] !== undefined) {
      issues.push(`a ${c.kind} case must not carry expect.${key}`);
    }
  }
  if (c.kind === "crops" && c.cropId !== undefined) {
    issues.push(`a crops case must not carry cropId (got "${c.cropId}")`);
  }
  if (c.kind === "varieties" && c.cropId === undefined) {
    issues.push("a varieties case must carry cropId");
  }

  // Every crop id the case names must exist in the Crop Dictionary, and — for
  // the ones an `expect` asserts on — must be a candidate on the case date, so
  // no constraint quietly restates invariant 2.
  const candidates = candidateCropIds(c.today);
  const known = new Set<string>();
  for (const ref of cropIdRefs(c)) {
    if (ref.id === "*") {
      // Handled by the `mustExclude` check below; not a dictionary id.
      continue;
    }
    if (!isCropId(ref.id)) {
      issues.push(`${ref.path} "${ref.id}" is not a Crop Dictionary id`);
      continue;
    }
    known.add(ref.id);
    if (!candidates.includes(ref.id)) {
      issues.push(
        `${ref.path} "${ref.id}" is not a candidate on ${c.today}; ` +
          `invariant 2 already covers it, so drop the constraint`,
      );
    }
  }

  const mustInclude = c.expect?.mustInclude ?? [];
  const mustExclude = c.expect?.mustExclude ?? [];
  if (mustExclude.includes("*")) {
    issues.push('expect.mustExclude contains "*"; list crop ids instead');
  }
  if (mustInclude.length > MAX_MUST_INCLUDE) {
    issues.push(
      `expect.mustInclude holds ${mustInclude.length} ids but top holds at most ${MAX_MUST_INCLUDE}`,
    );
  }
  for (const id of mustInclude) {
    if (mustExclude.includes(id)) {
      issues.push(
        `expect.mustInclude and expect.mustExclude both list "${id}"; they must be disjoint`,
      );
    }
  }

  // Satisfiability, over the ids that got this far: a case no answer can
  // satisfy is a bug in the case, not a finding about the model.
  if (mustInclude.length > 0 || mustExclude.length > 0) {
    const excluded = new Set(mustExclude);
    const survivors = candidates.filter((id) => !excluded.has(id));
    if (survivors.length === 0) {
      issues.push(
        `expect.mustExclude leaves no candidate on ${c.today}; the case is unsatisfiable`,
      );
    }
    for (const id of mustInclude) {
      if (!known.has(id) || !candidates.includes(id)) continue;
      if (!survivors.includes(id)) {
        issues.push(
          `expect.mustInclude "${id}" does not survive expect.mustExclude; the case is unsatisfiable`,
        );
      }
    }
  }

  // Variety names are checked against the crop the case ranks.
  const cropId: CropId | null =
    c.cropId !== undefined && isCropId(c.cropId) ? c.cropId : null;
  if (cropId !== null) {
    const names = varietyNames(cropId);
    for (const ref of varietyRefs(c)) {
      if (!names.includes(ref.name)) {
        issues.push(
          `${ref.path} "${ref.name}" is not a variety of ${cropId} in the Crop Dictionary`,
        );
      }
    }
  }

  return issues;
}
