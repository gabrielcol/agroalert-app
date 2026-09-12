import type { FieldProfile } from "@/lib/agro/field-profile";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import type { WeatherBrief } from "@/lib/weather/schema";

/**
 * Where the recommendation gets its Weather Brief. Issue 0005 ships the real
 * producer (`getWeatherBrief(fieldProfileId)` in `src/lib/weather`); until it
 * lands on main this seam serves the foundation fixture centred on the Field
 * Location, dated today. Any throw from a source is surfaced as
 * `WeatherUnavailableError` by the service.
 */
export type WeatherBriefSource = (
  profile: FieldProfile,
  today: string,
) => Promise<WeatherBrief>;

// TODO(issue 0005): swap for `getWeatherBrief` from "@/lib/weather".
export const fixtureWeatherBriefSource: WeatherBriefSource = async (
  profile,
  today,
) => {
  const brief = weatherBriefFixture(today);
  return { ...brief, location: { lat: profile.lat, lng: profile.lng } };
};
