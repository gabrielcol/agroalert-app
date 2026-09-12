import { describe, expect, it } from "vitest";

import {
  cropRecommendationFixture,
  varietyRecommendationFixture,
} from "./recommendation-fixture";
import {
  cropRecommendationRecordSchema,
  cropRecommendationSchema,
  varietyRecommendationSchema,
} from "./recommendation-schema";
import { weatherBriefFixture } from "@/lib/weather/fixture";

describe("Crop Recommendation contract", () => {
  it("parses the fixture round-trip unchanged", () => {
    expect(cropRecommendationSchema.parse(cropRecommendationFixture)).toEqual(
      cropRecommendationFixture,
    );
  });

  it("allows at most three crops on top", () => {
    const four = {
      ...cropRecommendationFixture,
      top: [...cropRecommendationFixture.top, cropRecommendationFixture.top[0]],
    };
    expect(cropRecommendationSchema.safeParse(four).success).toBe(false);
  });

  it("rejects a crop id outside the Crop Dictionary", () => {
    const [first, ...rest] = cropRecommendationFixture.top;
    expect(
      cropRecommendationSchema.safeParse({
        ...cropRecommendationFixture,
        top: [{ ...first, cropId: "banane" }, ...rest],
      }).success,
    ).toBe(false);
  });

  it("rejects a missing confidence or an out-of-range fit", () => {
    const [first, ...rest] = cropRecommendationFixture.top;
    const withoutConfidence: Partial<typeof first> = { ...first };
    delete withoutConfidence.confidence;
    expect(
      cropRecommendationSchema.safeParse({
        ...cropRecommendationFixture,
        top: [withoutConfidence, ...rest],
      }).success,
    ).toBe(false);
    expect(
      cropRecommendationSchema.safeParse({
        ...cropRecommendationFixture,
        top: [{ ...first, fit: 101 }, ...rest],
      }).success,
    ).toBe(false);
  });

  it("requires at least one reason per crop", () => {
    const [first, ...rest] = cropRecommendationFixture.top;
    expect(
      cropRecommendationSchema.safeParse({
        ...cropRecommendationFixture,
        top: [{ ...first, reasons: [] }, ...rest],
      }).success,
    ).toBe(false);
  });

  it("parses a stored record with its Weather Brief snapshot", () => {
    const record = {
      id: "rec1",
      fieldProfileId: "fp1",
      weatherBrief: weatherBriefFixture(),
      result: cropRecommendationFixture,
      modelId: "claude-sonnet-5",
      createdAt: new Date("2026-09-12T10:00:00Z"),
    };
    expect(cropRecommendationRecordSchema.parse(record)).toEqual(record);
  });
});

describe("Variety Recommendation contract", () => {
  it("parses the fixture round-trip unchanged", () => {
    expect(
      varietyRecommendationSchema.parse(varietyRecommendationFixture),
    ).toEqual(varietyRecommendationFixture);
  });

  it("accepts an empty ranking (a crop with no listed varieties)", () => {
    expect(
      varietyRecommendationSchema.safeParse({ cropId: "linte", ranked: [] })
        .success,
    ).toBe(true);
  });

  it("rejects a variety without reasons", () => {
    expect(
      varietyRecommendationSchema.safeParse({
        cropId: "grau_toamna",
        ranked: [{ varietyName: "Glosa", fit: 80, reasons: [] }],
      }).success,
    ).toBe(false);
  });
});
