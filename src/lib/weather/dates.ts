import { TIMEZONE } from "./schema";

/** Calendar helpers for ISO `YYYY-MM-DD` dates. All arithmetic is in UTC on
 * date-only values, so no DST shifts leak in; "today" is taken in the
 * product's timezone (Europe/Bucharest). */

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function dayOfYear(date: string): number {
  const d = parseIsoDate(date);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Today's calendar date in the product timezone. */
export function todayIn(now: Date, timeZone: string = TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
