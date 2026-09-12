import type Anthropic from "@anthropic-ai/sdk";

import {
  cropDictionary,
  getCrop,
  varietyNames,
  type CropId,
} from "@/lib/agro/crop-dictionary";
import { LAND_BUCKET_HA, type FieldProfile } from "@/lib/agro/field-profile";
import type { WeatherBrief } from "@/lib/weather/schema";
import { CANDIDATE_HORIZON_DAYS, qualifyingWindows } from "./candidates";
import { CROP_TOOL_NAME, VARIETY_TOOL_NAME } from "./tools";

/**
 * Prompt assembly. Stable content first (instructions, then the Crop
 * Dictionary block carrying the cache breakpoint); everything that varies per
 * request (today, the Field Profile, the Weather Brief) goes in the user turn.
 */

const INSTRUCTIONS = `You are an agronomy advisor for Romanian field farmers. You judge which field crops fit one parcel, using only the Crop Dictionary supplied below, the farmer's Field Profile and the Weather Brief for that parcel.

Rules:
- Recommend only crop ids that exist in the Crop Dictionary. Never invent crops or varieties.
- Candidacy: a crop may be in the top list only if one of its sowing windows is open on today's date or opens within the outlook horizon. The user message names the candidate crops and their concrete windows; every other crop goes under "excluded" with a one-sentence reason (usually naming its next window).
- Weigh, in order: soil class fit, the sowing window against the forecast (soil temperature, rain before and after sowing), water availability (irrigation, current-season anomalies, the ten-year normals and drought years), frost and heat risk for the crop's calendar, and the farmer's surface.
- The Seasonal Outlook is an area tendency with low confidence; use it only to shade risks, never as a local forecast. The first seven forecast days are the trusted part.
- The Weather Brief is aggregated; do not claim a precision it lacks.
- Write every reason and risk in Romanian, in plain farmer language, one short sentence each, concrete (name the month, the soil, the anomaly). Reasons say why this crop fits this parcel now; risks say what could go wrong.
- "fit" is 0-100. "confidence" reflects how well the data supports the call.
- Record the answer by calling the requested tool exactly once. Do not answer in prose.`;

/** Deterministic dictionary text: the same bytes on every call, so it caches. */
const DICTIONARY_BLOCK = `Crop Dictionary (JSON, ${cropDictionary.crops.length} crops):\n${JSON.stringify(cropDictionary.crops)}`;

export function buildSystem(): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: INSTRUCTIONS },
    {
      type: "text",
      text: DICTIONARY_BLOCK,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function describeProfile(profile: FieldProfile): string {
  const ha = LAND_BUCKET_HA[profile.landBucket];
  const surface =
    ha.max === null ? `over ${ha.min} ha` : `${ha.min}-${ha.max} ha`;
  return [
    "Field Profile:",
    `- village: ${profile.villageName}`,
    `- location: lat ${profile.lat}, lng ${profile.lng}`,
    `- surface: ${surface}`,
    `- irrigation: ${profile.irrigation ? "yes" : "no"}`,
    `- soil class (farmer's own description): ${profile.soilClass}`,
  ].join("\n");
}

export function describeCandidates(today: string): {
  candidateIds: string[];
  text: string;
} {
  const lines: string[] = [];
  const candidateIds: string[] = [];
  for (const crop of cropDictionary.crops) {
    const windows = qualifyingWindows(crop, today);
    if (windows.length === 0) continue;
    candidateIds.push(crop.id);
    const spans = windows
      .map((w) => `${w.from} to ${w.to} (${w.zone})`)
      .join("; ");
    lines.push(`- ${crop.id}: ${spans}`);
  }
  const text =
    `Candidate crops on ${today} (window open now or opening within ${CANDIDATE_HORIZON_DAYS} days):\n` +
    (lines.length ? lines.join("\n") : "- none") +
    `\nEvery other crop id must appear under "excluded".`;
  return { candidateIds, text };
}

export function buildCropUserMessage(input: {
  profile: FieldProfile;
  brief: WeatherBrief;
  today: string;
}): Anthropic.MessageParam {
  const { text: candidates } = describeCandidates(input.today);
  const text = [
    `Today is ${input.today} (${input.brief.timezone}).`,
    describeProfile(input.profile),
    candidates,
    `Weather Brief (JSON):\n${JSON.stringify(input.brief)}`,
    `Call the ${CROP_TOOL_NAME} tool with the top 3 candidate crops for this parcel and the excluded list.`,
  ].join("\n\n");
  return { role: "user", content: [{ type: "text", text }] };
}

export function buildVarietyUserMessage(input: {
  profile: FieldProfile;
  brief: WeatherBrief;
  today: string;
  cropId: CropId;
}): Anthropic.MessageParam {
  const crop = getCrop(input.cropId);
  const names = varietyNames(input.cropId);
  const text = [
    `Today is ${input.today} (${input.brief.timezone}).`,
    describeProfile(input.profile),
    `The farmer chose the crop "${input.cropId}" (${crop.name_ro}).`,
    `Its varieties in the Crop Dictionary are exactly: ${names.map((n) => `"${n}"`).join(", ")}. Rank all of them, none omitted, none added, best first.`,
    `Weather Brief (JSON):\n${JSON.stringify(input.brief)}`,
    `Call the ${VARIETY_TOOL_NAME} tool.`,
  ].join("\n\n");
  return { role: "user", content: [{ type: "text", text }] };
}
