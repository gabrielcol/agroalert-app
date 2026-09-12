import { describe, expect, it } from "vitest";

import compact from "./crop-dictionary.compact.json";
import { CROP_IDS, isCropId, type CropId } from "./crop-dictionary";

describe("CROP_IDS", () => {
  it("matches the compact dictionary exactly, in order", () => {
    expect([...CROP_IDS]).toEqual(compact.crops.map((crop) => crop.id));
  });

  it("is a real union type", () => {
    const wheat: CropId = "grau_toamna";
    expect(isCropId(wheat)).toBe(true);
    expect(isCropId("banane")).toBe(false);
  });
});
