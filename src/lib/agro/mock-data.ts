/**
 * Static content for the design shell. Labels live in the i18n dictionaries
 * (`t.agro.*`, keyed by these ids); this module only fixes the ids, their
 * order and which option the design shows pre-selected. Sowing Plans and the
 * recommendations are persisted through the API; the rest is static copy.
 */

export const LAND_SIZES = ["small", "medium", "large"] as const;
export type LandSize = (typeof LAND_SIZES)[number];
export const DEFAULT_LAND_SIZE: LandSize = "medium";

export const IRRIGATION_OPTIONS = ["yes", "no"] as const;
export type Irrigation = (typeof IRRIGATION_OPTIONS)[number];
export const DEFAULT_IRRIGATION: Irrigation = "no";

/**
 * The loading screen's steps, in order. Each one is backed by a real call
 * (issue 0011): `geocode.search`, `weather.climate`, `weather.forecast`,
 * `recommendation.crops`. Adding a step means adding a call.
 */
export const LOADING_STEPS = [
  "location",
  "history",
  "forecast",
  "recommendation",
] as const;
export type LoadingStep = (typeof LOADING_STEPS)[number];

// The cultura and soi steps read their Crop / Variety Recommendation from the
// API (issue 0006); their mock ids and copy are gone.

export const CALENDAR_ROWS = [
  "sowing",
  "emergence",
  "spring",
  "treatments",
  "harvest",
] as const;
export type CalendarRowId = (typeof CALENDAR_ROWS)[number];

/**
 * Days after the previous Stage (CONTEXT.md "Stage"); the first is day 0.
 * Static for the prototype: the same offsets for every crop.
 */
export const CALENDAR_STAGE_DAYS: Record<CalendarRowId, number> = {
  sowing: 0,
  emergence: 10,
  spring: 150,
  treatments: 60,
  harvest: 50,
};

export const ALERTS = ["drought", "rain", "anm"] as const;
export type AlertId = (typeof ALERTS)[number];
/** The ANM row is an "all clear"; the other two are pending warnings. */
export const ALERT_TONE: Record<AlertId, "warning" | "ok"> = {
  drought: "warning",
  rain: "warning",
  anm: "ok",
};
