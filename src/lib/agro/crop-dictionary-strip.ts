/**
 * Turns the research Crop Dictionary (`resources/culturi/crop-dictionary.json`,
 * every leaf wrapped as `{ value, source, verified }`) into the compact shape
 * the AI reads: the same tree with every wrapper collapsed to its `value`,
 * `source` / `verified` dropped wherever they sit beside real fields, the
 * `economics` block removed and the `verified_rule` convention (meaningless
 * without the flags) removed. ADR 0002 keeps "the model reads the whole file";
 * ADR 0003 / issue 0003 strip the provenance so the whole file fits a prompt.
 *
 * Missing fields stay missing: the dictionary's rule is that an absent value
 * means "no source gave one", and the model must say it does not know.
 */

const PROVENANCE_KEYS = new Set(["source", "verified"]);

function isPlainObject(node: unknown): node is Record<string, unknown> {
  return typeof node === "object" && node !== null && !Array.isArray(node);
}

/** A `{ value, source?, verified? }` wrapper and nothing else. */
function isProvenanceWrapper(node: Record<string, unknown>): boolean {
  if (!("value" in node)) return false;
  return Object.keys(node).every(
    (k) => k === "value" || PROVENANCE_KEYS.has(k),
  );
}

/** Recursively collapse provenance wrappers and drop `source` / `verified`. */
export function stripProvenance(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripProvenance);
  if (!isPlainObject(node)) return node;
  if (isProvenanceWrapper(node)) return stripProvenance(node.value);

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(node)) {
    if (PROVENANCE_KEYS.has(key)) continue;
    out[key] = stripProvenance(child);
  }
  return out;
}

type ResearchDictionary = {
  version?: unknown;
  generated_on?: unknown;
  evidence_class?: unknown;
  conventions?: Record<string, unknown>;
  crops: unknown[];
};

export type CompactCropDictionary = {
  version: unknown;
  generated_on: unknown;
  evidence_class: unknown;
  provenance: {
    stripped: true;
    source: string;
    note: string;
  };
  conventions: Record<string, unknown>;
  crops: Record<string, unknown>[];
};

export const RESEARCH_DICTIONARY_PATH =
  "resources/culturi/crop-dictionary.json";

/** Build the compact dictionary artifact from the research dictionary. */
export function compactCropDictionary(
  dictionary: ResearchDictionary,
): CompactCropDictionary {
  const conventions = { ...(dictionary.conventions ?? {}) };
  delete conventions.verified_rule;

  const crops = dictionary.crops.map((crop) => {
    const stripped = stripProvenance(crop) as Record<string, unknown>;
    delete stripped.economics;
    return stripped;
  });

  return {
    version: dictionary.version,
    generated_on: dictionary.generated_on,
    evidence_class: dictionary.evidence_class,
    provenance: {
      stripped: true,
      source: RESEARCH_DICTIONARY_PATH,
      note: "Every value here has a source and a verified flag in the research file; they were removed to fit the model prompt. A missing field means no source gave a value.",
    },
    conventions,
    crops,
  };
}
