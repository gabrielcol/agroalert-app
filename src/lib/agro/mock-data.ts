/**
 * Static content for the design shell. Labels live in the i18n dictionaries
 * (`t.agro.*`, keyed by these ids); this module only fixes the ids, their
 * order and which option the design shows pre-selected. No persistence, no
 * API — the wizard is a browsable prototype until the domain lands.
 */

export const LAND_SIZES = ["small", "medium", "large"] as const;
export type LandSize = (typeof LAND_SIZES)[number];
export const DEFAULT_LAND_SIZE: LandSize = "medium";

export const IRRIGATION_OPTIONS = ["yes", "no"] as const;
export type Irrigation = (typeof IRRIGATION_OPTIONS)[number];
export const DEFAULT_IRRIGATION: Irrigation = "no";

export const LOADING_STEPS = [
  "history",
  "forecast",
  "crops",
  "windows",
  "list",
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

export const ALERTS = ["drought", "rain", "anm"] as const;
export type AlertId = (typeof ALERTS)[number];
/** The ANM row is an "all clear"; the other two are pending warnings. */
export const ALERT_TONE: Record<AlertId, "warning" | "ok"> = {
  drought: "warning",
  rain: "warning",
  anm: "ok",
};

/**
 * Sowing plans shown on the dashboard. Empty → the empty state renders.
 * A plan carries no alert channel: the farmer subscribes to a plan's alerts,
 * and how those alerts are delivered is not modelled in the prototype.
 */
export const SAMPLE_PLANS: ReadonlyArray<{ id: string }> = [
  { id: "porumb-p0216" },
];
