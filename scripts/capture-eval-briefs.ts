/**
 * Capture the frozen Weather Briefs the eval dataset runs against.
 *
 *   bun run capture:eval-briefs
 *
 * Writes nine files to `evals/briefs/`:
 *
 * - Six **captured** briefs, one per agro-zone anchor location, pulled live
 *   from Open-Meteo through the same `ensure*` phases `getWeatherBrief` uses
 *   (no cache, no database). These are real observations for the day they were
 *   captured and are used unchanged as eval input.
 * - Three **synthetic** briefs for 2026-03-05, 2026-10-05 and 2026-08-20,
 *   derived from `weatherBriefFixture` because a real brief can only exist for
 *   the day it was captured. Their daily temperatures and ET0 are re-based on
 *   the Climate Profile's monthly normals so the brief is internally coherent
 *   with its date; the rain pattern is the fixture's. Labelled
 *   `"kind": "synthetic"` so nobody mistakes them for observations.
 *
 * Also writes `evals/briefs/SUMMARY.md`, the at-a-glance table the eval cases
 * are written from, plus the `candidateCropIds` list for each case date.
 *
 * Re-running overwrites everything in place. The ten-year archive pull is
 * heavy on Open-Meteo's free tier, so locations are spaced out and a
 * rate-limited location is retried once after a minute.
 *
 * Excluded from `tsc` (see tsconfig "exclude"); runs under `bun run`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { candidateCropIds } from "../src/lib/ai/candidates";
import {
  ensureClimateProfile,
  ensureOutlook,
  ensureShortRange,
  type PhaseContext,
} from "../src/lib/weather/brief";
import { daysInMonth, monthOf, todayIn } from "../src/lib/weather/dates";
import { weatherBriefFixture } from "../src/lib/weather/fixture";
import {
  createOpenMeteoClient,
  WeatherUnavailableError,
} from "../src/lib/weather/open-meteo";
import {
  TIMEZONE,
  UNITS,
  weatherBriefSchema,
  type MonthlyNormal,
  type WeatherBrief,
} from "../src/lib/weather/schema";

const OUT_DIR = "evals/briefs";
/** Open-Meteo's free tier does not love ten-year archive pulls back to back. */
const PAUSE_BETWEEN_LOCATIONS_MS = 3_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

type Location = {
  slug: string;
  name: string;
  county: string;
  zone: string;
  lat: number;
  lng: number;
};

/** One anchor per agro-zone the Crop Dictionary's sowing windows are keyed to. */
const LOCATIONS: Location[] = [
  {
    slug: "reviga",
    name: "Reviga",
    county: "Ialomița",
    zone: "Bărăgan plain",
    lat: 44.7,
    lng: 27.1,
  },
  {
    slug: "cobadin",
    name: "Cobadin",
    county: "Constanța",
    zone: "Dobrogea",
    lat: 44.083,
    lng: 28.217,
  },
  {
    slug: "dabuleni",
    name: "Dăbuleni",
    county: "Dolj",
    zone: "Oltenia sands",
    lat: 43.8,
    lng: 24.083,
  },
  {
    slug: "lovrin",
    name: "Lovrin",
    county: "Timiș",
    zone: "Banat plain",
    lat: 45.967,
    lng: 20.767,
  },
  {
    slug: "turda",
    name: "Turda",
    county: "Cluj",
    zone: "Transylvanian plateau",
    lat: 46.567,
    lng: 23.783,
  },
  {
    slug: "podu-iloaiei",
    name: "Podu Iloaiei",
    county: "Iași",
    zone: "Moldavian plain",
    lat: 47.217,
    lng: 27.267,
  },
];

/** The dates the eval cases need a brief for but no capture can produce. */
const SYNTHETIC_DATES = ["2026-03-05", "2026-10-05", "2026-08-20"];

const REVIGA = LOCATIONS[0];

const root = resolve(import.meta.dir, "..");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function writeJson(slug: string, payload: unknown) {
  const path = resolve(root, OUT_DIR, `${slug}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
  return path;
}

// ---------------------------------------------------------------------------
// Captured briefs
// ---------------------------------------------------------------------------

/**
 * The `getWeatherBrief` composition minus the cache and the database: run the
 * three phases against a `null` cached cell and assemble the same object.
 */
async function buildLiveBrief(
  location: Location,
  ctx: PhaseContext,
): Promise<WeatherBrief> {
  const point = { lat: location.lat, lng: location.lng };
  const climate = await ensureClimateProfile(point, null, ctx);
  const normals = climate.value.monthlyNormals;
  const short = await ensureShortRange(point, null, ctx, normals);
  const outlook = await ensureOutlook(point, null, ctx, normals);
  return weatherBriefSchema.parse({
    today: ctx.today,
    timezone: TIMEZONE,
    units: UNITS,
    location: point,
    climateProfile: climate.value,
    currentSeason: short.value.currentSeason,
    forecast: short.value.forecast,
    seasonalOutlook: outlook.value,
  });
}

async function captureLocation(
  location: Location,
  ctx: PhaseContext,
): Promise<WeatherBrief> {
  try {
    return await buildLiveBrief(location, ctx);
  } catch (err) {
    const rateLimited =
      err instanceof WeatherUnavailableError &&
      (err.message.includes("rate limited") || err.message.includes("429"));
    if (!rateLimited) throw err;
    console.warn(
      `  ${location.slug}: rate limited, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s and retrying once`,
    );
    await sleep(RATE_LIMIT_BACKOFF_MS);
    return await buildLiveBrief(location, ctx);
  }
}

// ---------------------------------------------------------------------------
// Synthetic briefs
// ---------------------------------------------------------------------------

function normalFor(normals: MonthlyNormal[], date: string): MonthlyNormal {
  return normals[monthOf(date) - 1];
}

/** The month normal's ET0 spread evenly over the month, mm/day. */
function dailyEt0(normal: MonthlyNormal, date: string): number {
  const year = Number(date.slice(0, 4));
  return normal.et0 / daysInMonth(year, monthOf(date));
}

const SYNTHETIC_NOTES = [
  "Derived from weatherBriefFixture(today), which is not real weather.",
  "Re-based on the Climate Profile monthly normals for each day's own month:",
  "forecast tMax/tMin (fixture drift of -0.4/-0.3 °C per day kept),",
  "forecast soilTemp0_9cm (= the day's mean temperature),",
  "forecast et0 and waterBalance (month normal ET0 spread over the month),",
  "and currentSeason.last30Days tMax/tMin/et0 (fixture wiggle kept, re-centred).",
  "Left as the fixture generates them: the rain pattern (precipSum,",
  "precipProbability, weatherCode), soilMoisture0_9cm, windGustsMax,",
  "snowfallSum (always 0, so a cold date shows no snow), the Climate Profile,",
  "currentSeason.monthly and the Seasonal Outlook — the last three already",
  "follow the date, since the fixture derives them from it.",
  "Known incoherence: the fixture's drift is a monotone cooling ramp, so the",
  "16-day forecast always trends colder — wrong-signed for a spring date.",
  "Day 0 is on the month normal; treat the tail as illustrative, not as a trend.",
].join(" ");

/**
 * A fixture brief made coherent with its date. The fixture's forecast is a
 * fixed late-summer ramp regardless of `today`; here every daily temperature
 * is re-based on the monthly normal of the day it falls in, so a March brief
 * reads like March.
 */
function buildSyntheticBrief(date: string): WeatherBrief {
  const base = weatherBriefFixture(date);
  const normals = base.climateProfile.monthlyNormals;

  const days = base.forecast.days.map((day, i) => {
    const normal = normalFor(normals, day.date);
    const tMax = round(normal.tMax - i * 0.4);
    const tMin = round(normal.tMin - i * 0.3);
    const et0 = round(dailyEt0(normal, day.date), 2);
    return {
      ...day,
      tMax,
      tMin,
      et0,
      waterBalance: round(day.precipSum - et0, 2),
      soilTemp0_9cm: round((tMax + tMin) / 2),
    };
  });

  const last30Days = base.currentSeason.last30Days.map((day, i) => {
    const normal = normalFor(normals, day.date);
    return {
      ...day,
      // the fixture's wiggle, re-centred on the month normal
      tMax: round(normal.tMax + (((i * 7) % 6) - 2.5)),
      tMin: round(normal.tMin + (((i * 3) % 5) - 2)),
      et0: round(dailyEt0(normal, day.date) + ((i * 2) % 3) * 0.2, 2),
    };
  });

  return weatherBriefSchema.parse({
    ...base,
    location: { lat: REVIGA.lat, lng: REVIGA.lng },
    forecast: { ...base.forecast, days },
    currentSeason: { ...base.currentSeason, last30Days },
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

type SummaryRow = {
  slug: string;
  kind: "captured" | "synthetic";
  place: string;
  today: string;
  day0TMax: number;
  day0TMin: number;
  forecastRainMm: number;
  lastMonth: number;
  tempAnomaly: number;
  precipAnomaly: number;
  droughtYears: number;
  outlookLabels: string;
};

function summarise(
  slug: string,
  kind: "captured" | "synthetic",
  place: string,
  brief: WeatherBrief,
): SummaryRow {
  const day0 = brief.forecast.days[0];
  const monthly = brief.currentSeason.monthly;
  const last = monthly[monthly.length - 1];
  return {
    slug,
    kind,
    place,
    today: brief.today,
    day0TMax: round(day0.tMax),
    day0TMin: round(day0.tMin),
    forecastRainMm: round(
      brief.forecast.days.reduce((sum, d) => sum + d.precipSum, 0),
    ),
    lastMonth: last.month,
    tempAnomaly: round(last.anomaly.tMean),
    precipAnomaly: round(last.anomaly.precipSum),
    droughtYears: brief.climateProfile.years.filter((y) => y.droughtFlag)
      .length,
    outlookLabels: brief.seasonalOutlook.weeks
      .map((w) => `${w.week}:${w.label}`)
      .join(" "),
  };
}

const SUMMARY_COLUMNS = [
  "slug",
  "kind",
  "place",
  "today",
  "day0 tMax/tMin °C",
  "forecast rain mm",
  "last month",
  "ΔT °C",
  "Δprecip mm",
  "drought yrs",
  "outlook weeks 3-7",
];

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/**
 * A markdown table padded the way Prettier pads one, so the generated file is
 * already formatted and a re-run never shows up as a formatting diff.
 */
function markdownTable(head: string[], body: string[][]): string[] {
  const width = (s: string) => Array.from(s).length;
  const widths = head.map((h, i) =>
    Math.max(3, width(h), ...body.map((row) => width(row[i]))),
  );
  const pad = (s: string, i: number) => s + " ".repeat(widths[i] - width(s));
  const line = (cells: string[]) =>
    `| ${cells.map((c, i) => pad(c, i)).join(" | ")} |`;
  return [
    line(head),
    `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`,
    ...body.map(line),
  ];
}

function summaryMarkdown(rows: SummaryRow[], dates: string[]): string {
  const header = [
    "<!-- Generated by `bun run capture:eval-briefs`. Do not edit by hand. -->",
    "",
    "# Eval Weather Briefs — summary",
    "",
    "One row per file in this folder. `captured` briefs are real Open-Meteo data",
    "frozen on the day they were pulled; `synthetic` briefs are generated from the",
    "fixture for a date no capture can cover, and each file's `notes` says exactly",
    "what was derived. Numbers here are the ones the eval cases are written from;",
    "the files themselves are the source of truth.",
    "",
  ];
  const body = markdownTable(
    SUMMARY_COLUMNS,
    rows.map((r) => [
      `\`${r.slug}\``,
      r.kind,
      r.place,
      r.today,
      `${r.day0TMax} / ${r.day0TMin}`,
      String(r.forecastRainMm),
      String(r.lastMonth),
      signed(r.tempAnomaly),
      signed(r.precipAnomaly),
      `${r.droughtYears} / 10`,
      r.outlookLabels,
    ]),
  );

  const candidates = [
    "",
    "## Candidate crops per case date",
    "",
    "`candidateCropIds(date)` — the 46-day candidate rule (CONTEXT.md “Crop",
    "Recommendation”). A Crop Recommendation case dated here may only rank crops",
    "from its list, and anything absent belongs in `mustExclude`.",
    "",
  ];
  for (const date of dates) {
    const ids = candidateCropIds(date);
    candidates.push(
      `- **${date}** (${ids.length}): ${ids.length ? ids.map((id) => `\`${id}\``).join(", ") : "_none_"}`,
    );
  }

  return [...header, ...body, ...candidates, ""].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const at = new Date();
const today = todayIn(at);
const ctx: PhaseContext = { at, today, client: createOpenMeteoClient() };

mkdirSync(resolve(root, OUT_DIR), { recursive: true });

const rows: SummaryRow[] = [];
const failed: string[] = [];

console.log(`Capturing ${LOCATIONS.length} Weather Briefs for ${today}\n`);

for (const [i, location] of LOCATIONS.entries()) {
  if (i > 0) await sleep(PAUSE_BETWEEN_LOCATIONS_MS);
  try {
    const brief = await captureLocation(location, ctx);
    writeJson(location.slug, {
      kind: "captured",
      slug: location.slug,
      name: location.name,
      county: location.county,
      zone: location.zone,
      capturedAt: at.toISOString(),
      source: "open-meteo",
      brief,
    });
    rows.push(
      summarise(
        location.slug,
        "captured",
        `${location.name}, ${location.county}`,
        brief,
      ),
    );
    console.log(`  ok   ${location.slug} (${location.zone})`);
  } catch (err) {
    failed.push(location.slug);
    console.error(
      `  FAIL ${location.slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

for (const date of SYNTHETIC_DATES) {
  const slug = `synthetic-${date}`;
  const brief = buildSyntheticBrief(date);
  writeJson(slug, {
    kind: "synthetic",
    slug,
    name: "Reviga (synthetic)",
    county: REVIGA.county,
    zone: REVIGA.zone,
    generatedAt: at.toISOString(),
    source: "fixture",
    notes: SYNTHETIC_NOTES,
    brief,
  });
  rows.push(summarise(slug, "synthetic", "Reviga (synthetic)", brief));
  console.log(`  ok   ${slug}`);
}

const caseDates = [today, ...SYNTHETIC_DATES];
const summaryPath = resolve(root, OUT_DIR, "SUMMARY.md");
writeFileSync(summaryPath, summaryMarkdown(rows, caseDates));

console.log(`\n${summaryMarkdown(rows, caseDates)}`);
console.log(
  `${rows.length} briefs written to ${OUT_DIR}/, summary in ${OUT_DIR}/SUMMARY.md`,
);

if (failed.length) {
  console.error(`\n${failed.length} location(s) failed: ${failed.join(", ")}`);
  process.exit(1);
}
