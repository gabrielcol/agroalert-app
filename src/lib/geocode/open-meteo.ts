import { z } from "zod";

/**
 * Open-Meteo Geocoding API client (GeoNames-backed). Resolves a typed village
 * or commune name to Field Location candidates inside Romania. No API key,
 * free tier. There is no reverse-geocoding endpoint, so a point from the
 * browser's geolocation keeps a generic label (see the teren step).
 */

export const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const RESULT_COUNT = 5;
const COUNTRY = "RO";

const resultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  admin2: z.string().optional(),
  admin3: z.string().optional(),
  admin4: z.string().optional(),
});
const responseSchema = z.object({
  results: z.array(resultSchema).optional(),
});

export type PlaceMatch = { name: string; lat: number; lng: number };

/**
 * "Sat, Comuna, Județ" from the GeoNames admin levels. Open-Meteo returns
 * the county as admin1 and the commune as admin2 (sometimes admin3); levels
 * that repeat the village name or each other are dropped.
 */
export function formatPlaceName(r: {
  name: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
}): string {
  const parts: string[] = [];
  for (const part of [r.name, r.admin4, r.admin3, r.admin2, r.admin1]) {
    const value = part?.trim();
    if (value && !parts.includes(value)) parts.push(value);
  }
  return parts.join(", ");
}

export async function searchPlaces(
  query: string,
  { fetch: fetchImpl = fetch }: { fetch?: typeof fetch } = {},
): Promise<PlaceMatch[]> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(RESULT_COUNT));
  url.searchParams.set("language", "ro");
  url.searchParams.set("countryCode", COUNTRY);
  url.searchParams.set("format", "json");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo geocoding failed: HTTP ${res.status}`);
  }
  const body = responseSchema.parse(await res.json());
  return (body.results ?? [])
    .filter((r) => (r.country_code ?? COUNTRY) === COUNTRY)
    .map((r) => ({
      name: formatPlaceName(r),
      lat: r.latitude,
      lng: r.longitude,
    }));
}
