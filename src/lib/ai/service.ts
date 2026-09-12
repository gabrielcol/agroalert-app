import { env } from "@/env";
import type { CropId } from "@/lib/agro/crop-dictionary";
import type { FieldProfile } from "@/lib/agro/field-profile";
import type {
  CropRecommendation,
  VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import { db } from "@/lib/db";
import {
  FieldProfileNotFoundError,
  WeatherUnavailableError as OpenMeteoUnavailableError,
} from "@/lib/weather";
import { TIMEZONE, type WeatherBrief } from "@/lib/weather/schema";
import { createAnthropicClient } from "./client";
import { WeatherUnavailableError } from "./errors";
import {
  rankVarieties,
  recommendCrops,
  type MessagesClient,
} from "./recommend";
import {
  createOpenMeteoWeatherBriefSource,
  type WeatherBriefSource,
} from "./weather-brief-source";

/**
 * The recommendation service the router calls: fetches the Weather Brief,
 * runs the Claude call, returns what the router persists. Dependencies are
 * injected so router tests swap in fakes (`setRecommendationService`).
 */

export type RecommendationService = {
  crops(profile: FieldProfile): Promise<{
    brief: WeatherBrief;
    result: CropRecommendation;
    modelId: string;
  }>;
  varieties(input: {
    profile: FieldProfile;
    brief: WeatherBrief;
    cropId: CropId;
  }): Promise<{ result: VarietyRecommendation; modelId: string }>;
};

export type RecommendationDeps = {
  createClient: () => MessagesClient;
  weatherBriefSource: WeatherBriefSource;
  model: string;
  today: () => string;
};

/** Today's date in the product timezone, ISO `YYYY-MM-DD`. */
export function todayInBucharest(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function createRecommendationService(
  deps: RecommendationDeps,
): RecommendationService {
  return {
    async crops(profile) {
      const today = deps.today();
      let brief: WeatherBrief;
      try {
        brief = await deps.weatherBriefSource(profile, today);
      } catch (cause) {
        // The profile vanished between the router's lookup and the brief:
        // that is NOT_FOUND, not a weather outage. The weather module's own
        // WeatherUnavailableError is a different class with the same name
        // as ours (hence the alias); it and anything unexpected become an
        // unavailable brief (ADR 0003: no degraded recommendation).
        if (cause instanceof FieldProfileNotFoundError) throw cause;
        if (cause instanceof OpenMeteoUnavailableError) {
          throw new WeatherUnavailableError(cause);
        }
        throw new WeatherUnavailableError(cause);
      }
      const client = deps.createClient();
      const result = await recommendCrops({
        client,
        model: deps.model,
        profile,
        brief,
        // Anchor on the brief's own day so the candidate rule, the forecast
        // and the stored snapshot agree even when the call spans midnight.
        today: brief.today,
      });
      return { brief, result, modelId: deps.model };
    },

    async varieties({ profile, brief, cropId }) {
      const client = deps.createClient();
      const result = await rankVarieties({
        client,
        model: deps.model,
        profile,
        brief,
        // The variety call is anchored on the same day as its Crop
        // Recommendation, so both read the same Weather Brief.
        today: brief.today,
        cropId,
      });
      return { result, modelId: deps.model };
    },
  };
}

let current: RecommendationService | null = null;

export function getRecommendationService(): RecommendationService {
  return (current ??= createRecommendationService({
    createClient: createAnthropicClient,
    weatherBriefSource: createOpenMeteoWeatherBriefSource({ db }),
    model: env.AI_MODEL,
    today: todayInBucharest,
  }));
}

/** Test seam: install a fake service (pass `null` to restore the default). */
export function setRecommendationService(
  service: RecommendationService | null,
): void {
  current = service;
}
