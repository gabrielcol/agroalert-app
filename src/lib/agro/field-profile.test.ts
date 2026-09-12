import { describe, expect, it } from "vitest";

import {
  LAND_BUCKET_HA,
  fieldProfileInputSchema,
  weatherCellFor,
} from "./field-profile";

const valid = {
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
};

describe("fieldProfileInputSchema", () => {
  it("accepts a complete profile", () => {
    expect(fieldProfileInputSchema.parse(valid)).toEqual(valid);
  });

  it("defaults soil class to unknown", () => {
    const withoutSoil: Partial<typeof valid> = { ...valid };
    delete withoutSoil.soilClass;
    expect(fieldProfileInputSchema.parse(withoutSoil).soilClass).toBe(
      "unknown",
    );
  });

  it("rejects a point outside Romania", () => {
    expect(
      fieldProfileInputSchema.safeParse({ ...valid, lat: 51.5, lng: -0.1 })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown soil class or land bucket", () => {
    expect(
      fieldProfileInputSchema.safeParse({ ...valid, soilClass: "turba" })
        .success,
    ).toBe(false);
    expect(
      fieldProfileInputSchema.safeParse({ ...valid, landBucket: "huge" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty village name", () => {
    expect(
      fieldProfileInputSchema.safeParse({ ...valid, villageName: "  " })
        .success,
    ).toBe(false);
  });
});

describe("land buckets", () => {
  it("match the teren copy: under 5, 5-10, over 10 ha", () => {
    expect(LAND_BUCKET_HA.small).toEqual({ min: 0, max: 5 });
    expect(LAND_BUCKET_HA.medium).toEqual({ min: 5, max: 10 });
    expect(LAND_BUCKET_HA.large).toEqual({ min: 10, max: null });
  });
});

describe("weatherCellFor", () => {
  it("rounds to the 0.1° cell", () => {
    expect(weatherCellFor({ lat: 44.6812, lng: 27.1149 })).toEqual({
      latCell: 44.7,
      lngCell: 27.1,
    });
  });

  it("puts nearby points in the same cell", () => {
    const a = weatherCellFor({ lat: 44.66, lng: 27.14 });
    const b = weatherCellFor({ lat: 44.74, lng: 27.06 });
    expect(a).toEqual(b);
  });
});
