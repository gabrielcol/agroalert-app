import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import {
  FieldProfileNotFoundError,
  getWeatherBrief,
  WeatherUnavailableError,
} from "@/lib/weather";
import { weatherBriefSchema } from "@/lib/weather/schema";

export const weatherBriefInput = z.object({
  fieldProfileId: z.string().min(1),
});

/**
 * Weather Brief for a Field Profile: Open-Meteo, aggregated and cached per
 * 0.1° cell (issue 0005). Open-Meteo failures surface as SERVICE_UNAVAILABLE
 * so the wizard can show its retry screen; there is no partial brief.
 */
export const weatherRouter = createTRPCRouter({
  brief: publicProcedure
    .input(weatherBriefInput)
    .output(weatherBriefSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getWeatherBrief(input.fieldProfileId, { db: ctx.db });
      } catch (err) {
        if (err instanceof FieldProfileNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (err instanceof WeatherUnavailableError) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: err.message,
            cause: err,
          });
        }
        throw err;
      }
    }),
});
