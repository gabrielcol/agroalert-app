import {
  CALENDAR_ROWS,
  CALENDAR_STAGE_DAYS,
  type CalendarRowId,
} from "@/lib/agro/mock-data";

/**
 * Crop Calendar arithmetic (CONTEXT.md "Crop Calendar", "Stage", "Sowing
 * Date"). Pure: no React, no clock — callers pass `today`. All arithmetic is
 * in calendar days (local time), so a DST change never shifts a Stage.
 */

export type StageId = CalendarRowId;

export type StageOffset = { id: StageId; offsetDays: number };
export type StageDate = StageOffset & { date: Date };
export type NextStage = { id: StageId; daysUntil: number };

/** Every Stage with its cumulative offset from the Sowing Date (first = 0). */
export function stageOffsets(): StageOffset[] {
  let offsetDays = 0;
  return CALENDAR_ROWS.map((id) => {
    offsetDays += CALENDAR_STAGE_DAYS[id];
    return { id, offsetDays };
  });
}

/** Midnight (local time) of the given date; returns a copy. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Add whole calendar days; returns a copy at the same wall-clock time. */
export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  // Compare in UTC so a DST transition between the two midnights counts as
  // exactly one day.
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / 86_400_000);
}

/** Every Stage placed on the calendar from the Sowing Date. */
export function stageDates(sownAt: Date): StageDate[] {
  const day0 = startOfDay(sownAt);
  return stageOffsets().map((stage) => ({
    ...stage,
    date: addDays(day0, stage.offsetDays),
  }));
}

/**
 * The first Stage that is today or still ahead, with the days until it
 * (0 = today). `null` once the last Stage is behind us.
 */
export function nextStage(sownAt: Date, today: Date): NextStage | null {
  for (const stage of stageDates(sownAt)) {
    const daysUntil = daysBetween(today, stage.date);
    if (daysUntil >= 0) return { id: stage.id, daysUntil };
  }
  return null;
}
