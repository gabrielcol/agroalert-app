import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import {
  FieldProfileNotFoundError,
  getWeatherBrief,
  refreshClimateProfile,
  refreshForecast,
  WeatherUnavailableError,
} from "@/lib/weather";
import { weatherBriefSchema } from "@/lib/weather/schema";

export const weatherBriefInput = z.object({
  fieldProfileId: z.string().min(1),
});

/** What the two cache-warming procedures answer with: small on purpose. */
export const weatherCacheStatusSchema = z.object({
  /** The 0.1° cell the Field Profile falls in, e.g. `44.6,27.1`. */
  cellId: z.string().min(1),
  /** False when the slice was already fresh and nothing was refetched. */
  refreshed: z.boolean(),
});

/** Maps the weather module's failures; anything else is left as it is. */
function rethrow(error: unknown): never {
  if (error instanceof FieldProfileNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (error instanceof WeatherUnavailableError) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: error.message,
      cause: error,
    });
  }
  throw error;
}

/**
 * Weather Brief for a Field Profile: Open-Meteo, aggregated and cached per
 * 0.1° cell (issue 0005). Open-Meteo failures surface as SERVICE_UNAVAILABLE
 * so the wizard can show its retry screen; there is no partial brief.
 *
 * `climate` and `forecast` warm one slice of that cache each so the loading
 * screen has a real call behind its "history" and "forecast" steps (issue
 * 0011); by the time `recommendation.crops` asks for the whole brief, it is
 * served from the cell.
 */
export const weatherRouter = createTRPCRouter({
  brief: publicProcedure
    .input(weatherBriefInput)
    .output(weatherBriefSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getWeatherBrief(input.fieldProfileId, { db: ctx.db });
      } catch (err) {
        rethrow(err);
      }
    }),

  climate: publicProcedure
    .input(weatherBriefInput)
    .output(weatherCacheStatusSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await refreshClimateProfile(input.fieldProfileId, {
          db: ctx.db,
        });
      } catch (err) {
        rethrow(err);
      }
    }),

  forecast: publicProcedure
    .input(weatherBriefInput)
    .output(weatherCacheStatusSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await refreshForecast(input.fieldProfileId, { db: ctx.db });
      } catch (err) {
        rethrow(err);
      }
    }),
});
