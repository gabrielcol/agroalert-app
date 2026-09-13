// @vitest-environment node
import { describe, expect, it } from "vitest";

import type {
  CropRecommendation,
  VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import { cropRecommendationFixture } from "@/lib/agro/recommendation-fixture";
import { completeExcluded } from "@/lib/ai/recommend";
import {
  cropInvariantIssues,
  expectIssues,
  varietyInvariantIssues,
} from "./assertions";
import type { EvalCase } from "./case-schema";
import { loadCases } from "./dataset";

const cases = loadCases();

function caseNamed(id: string): EvalCase {
  const found = cases.find((entry) => entry.case.id === id);
  if (!found) throw new Error(`No eval case ${id}`);
  return found.case;
}

const cropsCase = caseNamed("crops-reviga-cernoziom-irrigated");
const varietiesCase = caseNamed("varieties-turda-grau-toamna-dryland");

/**
 * The crop fixture with each `sowingWindow` moved onto a real dictionary
 * occurrence for the case date, and `excluded` completed the way the server
 * completes it (issue 0020). That makes it satisfy every invariant, so a test
 * can break exactly one thing.
 */
function validCropResult(): CropRecommendation {
  const windows: Record<string, { from: string; to: string }> = {
    grau_toamna: { from: "2026-10-01", to: "2026-10-10" },
    orz_toamna: { from: "2026-09-25", to: "2026-10-05" },
    rapita_toamna: { from: "2026-09-05", to: "2026-09-15" },
  };
  const base = structuredClone(cropRecommendationFixture);
  return completeExcluded(
    {
      top: base.top.map((crop) => ({
        ...crop,
        sowingWindow: windows[crop.cropId] ?? crop.sowingWindow,
      })),
      excluded: base.excluded,
    },
    cropsCase.today,
  );
}

/** Every winter-wheat variety ranked, best first — a valid variety answer. */
function validVarietyResult(): VarietyRecommendation {
  const order = ["Ursita", "Voinic", "Glosa", "Izvor", "Otilia"];
  return {
    cropId: "grau_toamna",
    ranked: order.map((name, index) => ({
      varietyName: name,
      fit: 92 - index * 4,
      reasons: ["Toleranță ridicată la secetă în zona parcelei."],
    })),
  };
}

describe("cropInvariantIssues", () => {
  it("accepts a complete, candidate-clean result", () => {
    expect(cropInvariantIssues(validCropResult(), cropsCase)).toEqual([]);
  });

  it("flags a fit that is not strictly descending", () => {
    const result = validCropResult();
    result.top[1].fit = result.top[0].fit;
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("fit"),
    ]);
  });

  it("flags an English reason", () => {
    const result = validCropResult();
    result.top[0].reasons = ["The soil is deep and holds water."];
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("not Romanian"),
    ]);
  });

  it("flags markdown in a reason", () => {
    const result = validCropResult();
    result.top[0].reasons = ["**Solul** reține apa necesară răsăririi."];
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("markdown"),
    ]);
  });

  it("flags a dictionary crop missing from excluded", () => {
    const result = validCropResult();
    result.excluded = result.excluded.filter((e) => e.cropId !== "porumb");
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("porumb"),
    ]);
  });

  it("flags a sowing window outside the dictionary windows", () => {
    const result = validCropResult();
    result.top[0].sowingWindow = { from: "2026-11-01", to: "2026-11-10" };
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("sowingWindow"),
    ]);
  });

  it("flags a non-candidate crop in top", () => {
    const result = validCropResult();
    result.top[0] = { ...result.top[0], cropId: "porumb" };
    expect(cropInvariantIssues(result, cropsCase)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("is not a candidate on 2026-09-13"),
      ]),
    );
  });

  it("flags an invented variety name under recommendedVarietyIds", () => {
    const result = validCropResult();
    result.top[0].recommendedVarietyIds = ["Nadejdea"];
    expect(cropInvariantIssues(result, cropsCase)).toEqual([
      expect.stringContaining("Nadejdea"),
    ]);
  });

  it("flags high confidence on a lowData case", () => {
    const lowData: EvalCase = { ...cropsCase, lowData: true };
    expect(cropInvariantIssues(validCropResult(), lowData)).toEqual([
      expect.stringContaining("high"),
    ]);
  });
});

describe("varietyInvariantIssues", () => {
  it("accepts a full ranking", () => {
    expect(varietyInvariantIssues(validVarietyResult(), varietiesCase)).toEqual(
      [],
    );
  });

  it("flags an omitted variety", () => {
    const result = validVarietyResult();
    result.ranked = result.ranked.slice(0, 4);
    expect(varietyInvariantIssues(result, varietiesCase)).toEqual([
      expect.stringContaining("Otilia"),
    ]);
  });

  it("flags a duplicate and an invented variety", () => {
    const result = validVarietyResult();
    result.ranked[4] = { ...result.ranked[4], varietyName: "Ursita" };
    expect(varietyInvariantIssues(result, varietiesCase)).toEqual(
      expect.arrayContaining([expect.stringContaining("Ursita")]),
    );
  });

  it("flags the wrong cropId", () => {
    const result = { ...validVarietyResult(), cropId: "secara" as const };
    expect(varietyInvariantIssues(result, varietiesCase)).toEqual(
      expect.arrayContaining([expect.stringContaining("secara")]),
    );
  });

  it("flags a ranking that is not strictly descending", () => {
    const result = validVarietyResult();
    result.ranked[1].fit = result.ranked[0].fit;
    expect(varietyInvariantIssues(result, varietiesCase)).toEqual([
      expect.stringContaining("fit"),
    ]);
  });
});

describe("expectIssues", () => {
  it("accepts a result that meets every crops constraint", () => {
    expect(
      expectIssues({ kind: "crops", result: validCropResult() }, cropsCase),
    ).toEqual([]);
  });

  it("flags a missing mustInclude crop", () => {
    const result = validCropResult();
    result.top = result.top.filter((c) => c.cropId !== "grau_toamna");
    expect(expectIssues({ kind: "crops", result }, cropsCase)).toEqual([
      expect.stringContaining("mustInclude"),
    ]);
  });

  it("flags a mustExclude crop that was recommended", () => {
    const withExclude: EvalCase = {
      ...cropsCase,
      expect: { mustExclude: ["rapita_toamna"] },
    };
    expect(
      expectIssues({ kind: "crops", result: validCropResult() }, withExclude),
    ).toEqual([expect.stringContaining("mustExclude")]);
  });

  it("applies a fitOrder pair only when both crops are in top", () => {
    const ordered: EvalCase = {
      ...cropsCase,
      expect: { fitOrder: [["rapita_toamna", "grau_toamna"]] },
    };
    expect(
      expectIssues({ kind: "crops", result: validCropResult() }, ordered),
    ).toEqual([expect.stringContaining("fitOrder")]);

    const absent: EvalCase = {
      ...cropsCase,
      expect: { fitOrder: [["secara", "grau_toamna"]] },
    };
    expect(
      expectIssues({ kind: "crops", result: validCropResult() }, absent),
    ).toEqual([]);
  });

  it("flags a confidence above maxConfidence", () => {
    const capped: EvalCase = {
      ...cropsCase,
      expect: { maxConfidence: "medium" },
    };
    expect(
      expectIssues({ kind: "crops", result: validCropResult() }, capped),
    ).toEqual([expect.stringContaining("maxConfidence")]);
  });

  it("accepts a variety ranking that meets topAny and varietyOrder", () => {
    expect(
      expectIssues(
        { kind: "varieties", result: validVarietyResult() },
        varietiesCase,
      ),
    ).toEqual([]);
  });

  it("flags the wrong variety ranked first", () => {
    const result = validVarietyResult();
    const [first, second] = [result.ranked[0], result.ranked[2]];
    result.ranked[0] = { ...second, fit: first.fit };
    result.ranked[2] = { ...first, fit: second.fit };
    expect(expectIssues({ kind: "varieties", result }, varietiesCase)).toEqual(
      expect.arrayContaining([expect.stringContaining("topAny")]),
    );
  });
});
