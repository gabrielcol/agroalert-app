import { z } from "zod";

/**
 * Field Profile contract (CONTEXT.md "Field Profile", "Field Location",
 * "Soil Class"). Frozen in issue 0003; the teren step (issue 0004) writes it,
 * the Weather Brief and recommendations (0005, 0006) read it.
 */

export const SOIL_CLASSES = [
  "cernoziom",
  "lutos",
  "argilos",
  "nisipos",
  "unknown",
] as const;
export const soilClassSchema = z.enum(SOIL_CLASSES);
export type SoilClass = z.infer<typeof soilClassSchema>;

export const LAND_BUCKETS = ["small", "medium", "large"] as const;
export const landBucketSchema = z.enum(LAND_BUCKETS);
export type LandBucket = z.infer<typeof landBucketSchema>;

/**
 * Hectare ranges behind the land buckets, matching the teren copy
 * ("< 5 ha", "5–10 ha", "10+ ha"). `max: null` means open-ended. Passed to
 * the AI as a range, never as an exact number.
 */
export const LAND_BUCKET_HA: Record<
  LandBucket,
  { min: number; max: number | null }
> = {
  small: { min: 0, max: 5 },
  medium: { min: 5, max: 10 },
  large: { min: 10, max: null },
};

/** Romania's bounding box, generously padded; rejects obviously wrong points. */
const ROMANIA_LAT = { min: 43.5, max: 48.5 };
const ROMANIA_LNG = { min: 20, max: 30 };

export const fieldLocationSchema = z.object({
  lat: z.number().min(ROMANIA_LAT.min).max(ROMANIA_LAT.max),
  lng: z.number().min(ROMANIA_LNG.min).max(ROMANIA_LNG.max),
});
export type FieldLocation = z.infer<typeof fieldLocationSchema>;

export const fieldProfileInputSchema = fieldLocationSchema.extend({
  villageName: z.string().trim().min(1).max(200),
  landBucket: landBucketSchema,
  irrigation: z.boolean(),
  soilClass: soilClassSchema.default("unknown"),
});
export type FieldProfileInput = z.infer<typeof fieldProfileInputSchema>;

/**
 * A stored Field Profile as the API returns it. The database keeps
 * `landBucket` / `soilClass` as plain strings; parse rows through this schema
 * so callers get the enums.
 */
export const fieldProfileSchema = fieldLocationSchema.extend({
  id: z.string(),
  villageName: z.string(),
  landBucket: landBucketSchema,
  irrigation: z.boolean(),
  soilClass: soilClassSchema,
  createdAt: z.date(),
});
export type FieldProfile = z.infer<typeof fieldProfileSchema>;

/**
 * Round a Field Location to the 0.1° cell used as the weather cache key
 * (about one ERA5-Land grid cell). Returned as numbers with one decimal.
 */
export function weatherCellFor(location: FieldLocation): {
  latCell: number;
  lngCell: number;
} {
  return {
    latCell: Math.round(location.lat * 10) / 10,
    lngCell: Math.round(location.lng * 10) / 10,
  };
}
