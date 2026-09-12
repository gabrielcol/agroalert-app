import { env } from "@/env";
import type { CropId } from "@/lib/agro/crop-dictionary";
import type { FieldProfile } from "@/lib/agro/field-profile";
import type {
  CropRecommendation,
  VarietyRecommendation,
} from "@/lib/agro/recommendation-schema";
import { TIMEZONE, type WeatherBrief } from "@/lib/weather/schema";
import { createAnthropicClient } from "./client";
import { WeatherUnavailableError } from "./errors";
import {
  rankVarieties,
  recommendCrops,
  type MessagesClient,
} from "./recommend";
import {
  fixtureWeatherBriefSource,
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
        throw new WeatherUnavailableError(cause);
      }
      const client = deps.createClient();
      const result = await recommendCrops({
        client,
        model: deps.model,
        profile,
        brief,
        today,
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
    weatherBriefSource: fixtureWeatherBriefSource,
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
