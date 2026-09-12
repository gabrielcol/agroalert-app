import { cropDictionary } from "@/lib/agro/crop-dictionary";

/**
 * The 46-day candidate rule (CONTEXT.md "Crop Recommendation"): a Crop is a
 * candidate only when one of its Sowing Windows is open today or opens within
 * the Seasonal Outlook horizon. Windows in the Crop Dictionary are `MM-DD`
 * pairs per zone; a window whose `to` precedes its `from` wraps the year.
 */

/** Days ahead the candidate rule looks: the Seasonal Outlook horizon. */
export const CANDIDATE_HORIZON_DAYS = 46 as const;

export type SowingWindowMmDd = { zone: string; from: string; to: string };

export type CandidateWindow = {
  cropId: string;
  zone: string;
  /** ISO dates of the concrete window occurrence that qualifies */
  from: string;
  to: string;
};

export type CropLike = {
  id: string;
  calendar?: { sowing_windows?: SowingWindowMmDd[] | null } | null;
};

const DAY_MS = 86_400_000;

function utc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Concrete intervals for a `MM-DD` window around `today`: the occurrence
 * starting last year, this year and next year, so wrapped and still-open
 * windows are found.
 */
function occurrences(window: SowingWindowMmDd, today: string) {
  const year = Number(today.slice(0, 4));
  const out: { from: number; to: number }[] = [];
  for (const y of [year - 1, year, year + 1]) {
    const from = utc(`${y}-${window.from}`);
    let to = utc(`${y}-${window.to}`);
    if (Number.isNaN(from) || Number.isNaN(to)) continue;
    if (to < from) to = utc(`${y + 1}-${window.to}`);
    out.push({ from, to });
  }
  return out;
}

/** Windows of one crop that are open on `today` or open within the horizon. */
export function qualifyingWindows(
  crop: CropLike,
  today: string,
  horizonDays: number = CANDIDATE_HORIZON_DAYS,
): CandidateWindow[] {
  const start = utc(today);
  const end = start + horizonDays * DAY_MS;
  const found: CandidateWindow[] = [];
  for (const window of crop.calendar?.sowing_windows ?? []) {
    for (const occ of occurrences(window, today)) {
      if (occ.from <= end && occ.to >= start) {
        found.push({
          cropId: crop.id,
          zone: window.zone,
          from: iso(occ.from),
          to: iso(occ.to),
        });
      }
    }
  }
  return found;
}

/** Crop ids (dictionary order) that pass the candidate rule on `today`. */
export function candidateCropIds(
  today: string,
  options: { crops?: CropLike[]; horizonDays?: number } = {},
): string[] {
  const crops = options.crops ?? (cropDictionary.crops as CropLike[]);
  return crops
    .filter(
      (crop) => qualifyingWindows(crop, today, options.horizonDays).length > 0,
    )
    .map((crop) => crop.id);
}
