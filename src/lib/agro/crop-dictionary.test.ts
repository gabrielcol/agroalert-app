import { describe, expect, it } from "vitest";

import {
  CROP_IDS,
  cropDictionary,
  cropIdSchema,
  getCrop,
  isCropId,
  varietyNames,
} from "./crop-dictionary";

describe("crop dictionary (compact artifact)", () => {
  it("is the stripped research dictionary", () => {
    expect(cropDictionary.provenance.stripped).toBe(true);
    expect(JSON.stringify(cropDictionary)).not.toContain('"verified"');
    expect(JSON.stringify(cropDictionary)).not.toContain('"economics"');
  });

  it("lists the 22 field crops", () => {
    expect(CROP_IDS).toHaveLength(22);
    expect(CROP_IDS).toContain("grau_toamna");
    expect(CROP_IDS).toContain("porumb");
  });

  it("validates crop ids against the dictionary", () => {
    expect(cropIdSchema.safeParse("rapita_toamna").success).toBe(true);
    expect(cropIdSchema.safeParse("banane").success).toBe(false);
    expect(isCropId("soia")).toBe(true);
    expect(isCropId("")).toBe(false);
  });

  it("returns a crop and its variety names", () => {
    expect(getCrop("grau_toamna").name_en).toBe("Winter wheat");
    expect(varietyNames("grau_toamna")).toContain("Glosa");
    expect(varietyNames("linte")).toEqual([]);
  });
});
