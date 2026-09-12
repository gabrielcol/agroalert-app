import { describe, expect, it } from "vitest";

import {
  compactCropDictionary,
  stripProvenance,
} from "./crop-dictionary-strip";

describe("stripProvenance", () => {
  it("unwraps a nested {value, source, verified} leaf to its value", () => {
    const input = {
      requirements: {
        soil: {
          ph_range: {
            value: { min: 6, max: 7.5 },
            source: "Ion V., Fitotehnie",
            verified: true,
          },
        },
      },
    };
    expect(stripProvenance(input)).toEqual({
      requirements: { soil: { ph_range: { min: 6, max: 7.5 } } },
    });
  });

  it("leaves a missing field missing (no null is invented)", () => {
    const input = {
      temperature: {
        germination_soil_c_min: { value: 2, source: "x", verified: false },
        // heat_critical_c intentionally absent
      },
    };
    const out = stripProvenance(input) as {
      temperature: Record<string, unknown>;
    };
    expect(out.temperature).toEqual({ germination_soil_c_min: 2 });
    expect("heat_critical_c" in out.temperature).toBe(false);
  });

  it("maps over a varieties[] array and unwraps every entry's leaves", () => {
    const input = {
      varieties: [
        {
          name: { value: "Izvor", source: "ISTIS", verified: true },
          traits: {
            value: "rezistent la secetă",
            source: "INCDA",
            verified: false,
          },
          recommended_zones: {
            value: ["sud", "est"],
            source: "INCDA",
            verified: true,
          },
        },
        {
          name: { value: "Glosa", source: "ISTIS", verified: true },
        },
      ],
    };
    expect(stripProvenance(input)).toEqual({
      varieties: [
        {
          name: "Izvor",
          traits: "rezistent la secetă",
          recommended_zones: ["sud", "est"],
        },
        { name: "Glosa" },
      ],
    });
  });

  it("drops source/verified from objects that carry them beside real fields (sowing windows)", () => {
    const input = {
      sowing_windows: [
        {
          zone: "sud",
          from: "10-01",
          to: "10-10",
          source: "USAMV",
          verified: true,
        },
      ],
    };
    expect(stripProvenance(input)).toEqual({
      sowing_windows: [{ zone: "sud", from: "10-01", to: "10-10" }],
    });
  });

  it("passes primitives and plain arrays through", () => {
    expect(stripProvenance("x")).toBe("x");
    expect(stripProvenance(3)).toBe(3);
    expect(stripProvenance([1, "a"])).toEqual([1, "a"]);
    expect(stripProvenance(null)).toBeNull();
  });
});

describe("compactCropDictionary", () => {
  const dictionary = {
    version: "1.0.0",
    generated_on: "2026-09-12",
    evidence_class: "desk-research finding",
    conventions: {
      units: { temperature: "°C" },
      irrigation_rule: "irigarea anulează season_need_mm",
      missing_field_rule: "lipsă = nu știm",
      verified_rule: "verified: true = sursă primară",
      soil_classes: ["cernoziom", "lutos", "argilos", "nisipos"],
    },
    crops: [
      {
        id: "grau_toamna",
        name_ro: "Grâu de toamnă",
        requirements: {
          soil: {
            suitable_classes: { value: ["lutos"], source: "s", verified: true },
          },
        },
        economics: {
          cost_per_ha: { value: 3000, source: "press", verified: false },
        },
        varieties: [
          { name: { value: "Glosa", source: "ISTIS", verified: true } },
        ],
      },
    ],
  };

  it("drops economics and the verified_rule convention, keeps the rest unwrapped", () => {
    const out = compactCropDictionary(dictionary);
    expect(out.crops).toEqual([
      {
        id: "grau_toamna",
        name_ro: "Grâu de toamnă",
        requirements: { soil: { suitable_classes: ["lutos"] } },
        varieties: [{ name: "Glosa" }],
      },
    ]);
    expect(out.conventions).toEqual({
      units: { temperature: "°C" },
      irrigation_rule: "irigarea anulează season_need_mm",
      missing_field_rule: "lipsă = nu știm",
      soil_classes: ["cernoziom", "lutos", "argilos", "nisipos"],
    });
  });

  it("records where the provenance went", () => {
    const out = compactCropDictionary(dictionary);
    expect(out.version).toBe("1.0.0");
    expect(out.generated_on).toBe("2026-09-12");
    expect(out.provenance).toMatchObject({
      stripped: true,
      source: "resources/culturi/crop-dictionary.json",
    });
  });
});
