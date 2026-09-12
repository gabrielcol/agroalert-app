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

export const LOADING_STEPS = ["forecast", "soil", "window", "anm"] as const;
export type LoadingStep = (typeof LOADING_STEPS)[number];

export const CROPS = ["grau", "orz", "rapita"] as const;
export type CropId = (typeof CROPS)[number];
export const RECOMMENDED_CROP: CropId = "grau";

export const VARIETIES = ["glosa", "pitar", "ursita"] as const;
export type VarietyId = (typeof VARIETIES)[number];
export const RECOMMENDED_VARIETY: VarietyId = "glosa";

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

export const CHANNELS = ["sms", "call", "app"] as const;
export type ChannelId = (typeof CHANNELS)[number];
export const DEFAULT_CHANNEL: ChannelId = "sms";

/** Sowing plans shown on the dashboard. Empty → the empty state renders. */
export const SAMPLE_PLANS: ReadonlyArray<{ id: string; channel: ChannelId }> = [
  { id: "porumb-p0216", channel: "sms" },
];
