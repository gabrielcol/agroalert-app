import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";

export const geocodeMatchSchema = z.object({
  /** "Sat, Comuna, Județ" as the geocoder names it */
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});
export type GeocodeMatch = z.infer<typeof geocodeMatchSchema>;

export const geocodeSearchInput = z.object({
  query: z.string().trim().min(2).max(120),
});

/**
 * Village name → Field Location candidates. Issue 0004 replaces the body with
 * the Open-Meteo Geocoding API (countryCode=RO); the contract stays. Until
 * then a single fixture match so the wizard can be driven end to end.
 */
const STUB_MATCHES: GeocodeMatch[] = [
  { name: "Reviga, Reviga, Ialomița", lat: 44.6833, lng: 27.1 },
];

export const geocodeRouter = createTRPCRouter({
  search: publicProcedure
    .input(geocodeSearchInput)
    .output(z.array(geocodeMatchSchema))
    .query(async () => STUB_MATCHES),
});
