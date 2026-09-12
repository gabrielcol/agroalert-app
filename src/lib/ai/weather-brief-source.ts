import type { FieldProfile } from "@/lib/agro/field-profile";
import { getWeatherBrief, type WeatherDb } from "@/lib/weather";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import type { WeatherBrief } from "@/lib/weather/schema";

/**
 * Where the recommendation gets its Weather Brief. The real producer is
 * `getWeatherBrief` from `src/lib/weather` (issue 0005): Open-Meteo behind the
 * per-cell `WeatherCell` cache. The brief's own `today` is authoritative — the
 * service anchors the model call on it — so the `today` argument is only a
 * hint for sources that have no clock of their own (the fixture). Whatever a
 * source throws, the service maps to a typed recommendation error.
 */
export type WeatherBriefSource = (
  profile: FieldProfile,
  today: string,
) => Promise<WeatherBrief>;

export type OpenMeteoSourceDeps = {
  db: WeatherDb;
  /** Test seam: defaults to the real `getWeatherBrief`. */
  getBrief?: typeof getWeatherBrief;
  now?: () => Date;
};

/** The production source: issue 0005's `getWeatherBrief` for the profile's id. */
export function createOpenMeteoWeatherBriefSource(
  deps: OpenMeteoSourceDeps,
): WeatherBriefSource {
  const getBrief = deps.getBrief ?? getWeatherBrief;
  return (profile) => getBrief(profile.id, { db: deps.db, now: deps.now });
}

/** Test double: the foundation fixture centred on the Field Location. */
export const fixtureWeatherBriefSource: WeatherBriefSource = async (
  profile,
  today,
) => {
  const brief = weatherBriefFixture(today);
  return { ...brief, location: { lat: profile.lat, lng: profile.lng } };
};
