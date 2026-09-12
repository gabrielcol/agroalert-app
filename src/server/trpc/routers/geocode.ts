import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { searchPlaces } from "@/lib/geocode/open-meteo";
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
 * Village name → Field Location candidates from the Open-Meteo Geocoding
 * API, scoped to Romania. The teren step takes the first match silently.
 * An upstream failure surfaces as a tRPC error so the wizard can offer a retry.
 */
export const geocodeRouter = createTRPCRouter({
  search: publicProcedure
    .input(geocodeSearchInput)
    .output(z.array(geocodeMatchSchema))
    .query(async ({ input }) => {
      try {
        return await searchPlaces(input.query);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Geocoding unavailable",
          cause: error,
        });
      }
    }),
});
