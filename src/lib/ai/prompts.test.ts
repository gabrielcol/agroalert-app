import { describe, expect, it } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import {
  buildCropUserMessage,
  buildSystem,
  buildVarietyUserMessage,
  describeCandidates,
} from "./prompts";

const profile: FieldProfile = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T00:00:00Z"),
};

function textOf(message: { content: unknown }): string {
  const blocks = message.content as { type: string; text: string }[];
  return blocks.map((b) => b.text).join("\n");
}

describe("prompts", () => {
  it("puts the cache breakpoint on the dictionary block, after stable instructions", () => {
    const system = buildSystem();
    expect(system).toHaveLength(2);
    expect(system[0].cache_control).toBeUndefined();
    expect(system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(system[1].text).toContain('"id":"grau_toamna"');
    // Deterministic: the same bytes on every call.
    expect(buildSystem()[1].text).toBe(system[1].text);
  });

  it("names the candidates and asks for exclusions only among them (issue 0020)", () => {
    const { candidateIds, text } = describeCandidates("2026-09-12");
    expect(candidateIds).toContain("grau_toamna");
    expect(candidateIds).not.toContain("porumb");
    expect(text).toContain("- grau_toamna:");
    expect(text).toContain("only the candidates you leave out");
    expect(text).toContain("excluded automatically");
    expect(text).not.toContain("Every other crop id");
  });

  it("puts today, the profile as ranges and the brief in the user turn", () => {
    const text = textOf(
      buildCropUserMessage({
        profile,
        brief: weatherBriefFixture("2026-09-12"),
        today: "2026-09-12",
      }),
    );
    expect(text).toContain("Today is 2026-09-12");
    expect(text).toContain("surface: 5-10 ha");
    expect(text).toContain("soil class (farmer's own description): cernoziom");
    expect(text).toContain('"climateProfile"');
    expect(text).toContain("recommend_crops");
  });

  it("lists every dictionary variety of the chosen crop for the variety call", () => {
    const text = textOf(
      buildVarietyUserMessage({
        profile,
        brief: weatherBriefFixture("2026-09-12"),
        today: "2026-09-12",
        cropId: "grau_toamna",
      }),
    );
    expect(text).toContain('"Glosa"');
    expect(text).toContain('"Izvor"');
    expect(text).toContain("none omitted, none added");
    expect(text).toContain("rank_varieties");
  });
});
