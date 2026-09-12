import { describe, expect, it } from "vitest";

import { CROPS, LOADING_STEPS, SAMPLE_PLANS, VARIETIES } from "./mock-data";
import { en } from "@/lib/i18n/dictionaries/en";
import { ro } from "@/lib/i18n/dictionaries/ro";

const DICTIONARIES = { ro, en } as const;
const LOCALES = ["ro", "en"] as const;

describe("LOADING_STEPS", () => {
  it("finds the field first, then names the five inputs the recommendation rests on", () => {
    expect(LOADING_STEPS).toEqual([
      "location",
      "history",
      "forecast",
      "crops",
      "windows",
      "list",
    ]);
  });

  it.each(LOCALES)("has copy for every step in %s", (locale) => {
    const steps = DICTIONARIES[locale].agro.loading.steps;
    for (const id of LOADING_STEPS) {
      expect(steps[id].length).toBeGreaterThan(0);
    }
  });
});

describe("crop copy", () => {
  it.each(LOCALES)(
    "every crop has a name, description and three reasons in %s",
    (locale) => {
      const crops = DICTIONARIES[locale].agro.cultura.crops;
      for (const id of CROPS) {
        const crop = crops[id];
        expect(crop.name.length).toBeGreaterThan(0);
        expect(crop.description.length).toBeGreaterThan(0);
        expect(crop.reasons.soil.length).toBeGreaterThan(0);
        expect(crop.reasons.window.length).toBeGreaterThan(0);
        expect(crop.reasons.weather.length).toBeGreaterThan(0);
      }
    },
  );

  it("flags a caution on exactly the risky crops", () => {
    const withCaution = CROPS.filter(
      (id) => "caution" in ro.agro.cultura.crops[id].reasons,
    );
    expect(withCaution).toEqual(["orz", "rapita"]);
  });

  it("agrees between ro and en on which crops carry a caution", () => {
    for (const id of CROPS) {
      expect("caution" in en.agro.cultura.crops[id].reasons).toBe(
        "caution" in ro.agro.cultura.crops[id].reasons,
      );
    }
  });
});

describe("variety copy", () => {
  it.each(LOCALES)(
    "every variety has a name, description, tag and three reasons in %s",
    (locale) => {
      const varieties = DICTIONARIES[locale].agro.soi.varieties;
      for (const id of VARIETIES) {
        const variety = varieties[id];
        expect(variety.name.length).toBeGreaterThan(0);
        expect(variety.description.length).toBeGreaterThan(0);
        expect(variety.tag.length).toBeGreaterThan(0);
        expect(variety.reasons.soil.length).toBeGreaterThan(0);
        expect(variety.reasons.window.length).toBeGreaterThan(0);
        expect(variety.reasons.weather.length).toBeGreaterThan(0);
      }
    },
  );

  it("flags a caution on exactly the risky varieties", () => {
    const withCaution = VARIETIES.filter(
      (id) => "caution" in ro.agro.soi.varieties[id].reasons,
    );
    expect(withCaution).toEqual(["pitar", "ursita"]);
  });

  it("agrees between ro and en on which varieties carry a caution", () => {
    for (const id of VARIETIES) {
      expect("caution" in en.agro.soi.varieties[id].reasons).toBe(
        "caution" in ro.agro.soi.varieties[id].reasons,
      );
    }
  });
});

describe("SAMPLE_PLANS", () => {
  it("carries no alert channel: a plan is just an id in the prototype", () => {
    expect(Object.keys(SAMPLE_PLANS[0])).toEqual(["id"]);
  });
});
