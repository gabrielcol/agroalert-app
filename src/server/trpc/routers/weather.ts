import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { weatherBriefSchema } from "@/lib/weather/schema";

export const weatherBriefInput = z.object({
  fieldProfileId: z.string().min(1),
});

/**
 * Weather Brief for a Field Profile. Issue 0005 replaces the body with the
 * Open-Meteo client, aggregation and the WeatherCell cache; the contract
 * (input → `weatherBriefSchema`) stays. Until then a fixture centred on the
 * profile's Field Location.
 */
export const weatherRouter = createTRPCRouter({
  brief: publicProcedure
    .input(weatherBriefInput)
    .output(weatherBriefSchema)
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.fieldProfile.findUnique({
        where: { id: input.fieldProfileId },
        select: { lat: true, lng: true },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      const brief = weatherBriefFixture();
      return { ...brief, location: { lat: profile.lat, lng: profile.lng } };
    }),
});
