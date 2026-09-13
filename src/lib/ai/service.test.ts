// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldProfile } from "@/lib/agro/field-profile";
import { cropRecommendationFixture } from "@/lib/agro/recommendation-fixture";
import {
  FieldProfileNotFoundError,
  WeatherUnavailableError as OpenMeteoUnavailableError,
} from "@/lib/weather";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { WeatherUnavailableError } from "./errors";
import { createRecommendationService } from "./service";
import { CROP_TOOL_NAME, VARIETY_TOOL_NAME } from "./tools";

const profile: FieldProfile = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T10:00:00Z"),
};

function failingBriefService(source: () => Promise<never>) {
  const createClient = vi.fn(() => {
    throw new Error("the model must not be called when the brief fails");
  });
  return createRecommendationService({
    createClient,
    weatherBriefSource: source,
    model: "claude-sonnet-5",
    today: () => "2026-09-12",
    logAiCall: async () => null,
  });
}

describe("createRecommendationService().crops — Weather Brief failures", () => {
  it("wraps the weather module's WeatherUnavailableError in the recommendation one, keeping the cause", async () => {
    const cause = new OpenMeteoUnavailableError("archive", 503, "rate limited");
    const svc = failingBriefService(() => Promise.reject(cause));
    const error = await svc.crops(profile).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WeatherUnavailableError);
    expect((error as WeatherUnavailableError).cause).toBe(cause);
  });

  it("lets FieldProfileNotFoundError through so the router answers NOT_FOUND", async () => {
    const cause = new FieldProfileNotFoundError("fp1");
    const svc = failingBriefService(() => Promise.reject(cause));
    await expect(svc.crops(profile)).rejects.toBe(cause);
  });

  it("treats any other failure as an unavailable brief (no degraded recommendation)", async () => {
    const svc = failingBriefService(() =>
      Promise.reject(new Error("socket hang up")),
    );
    await expect(svc.crops(profile)).rejects.toBeInstanceOf(
      WeatherUnavailableError,
    );
  });

  it("anchors the model call on the brief's own day, not the service clock", async () => {
    const brief = weatherBriefFixture("2026-09-13");
    const create = vi.fn().mockResolvedValue({ content: [] });
    const svc = createRecommendationService({
      createClient: () => ({ messages: { create } }) as never,
      weatherBriefSource: async () => brief,
      model: "claude-sonnet-5",
      today: () => "2026-09-12",
      logAiCall: async () => null,
    });
    // The fake client answers nothing usable; only the request is inspected.
    // It answers the correction retry (issue 0018) the same way, hence twice.
    await svc.crops(profile).catch(() => undefined);
    expect(create).toHaveBeenCalledTimes(2);
    const request = JSON.stringify(create.mock.calls[0]?.[0]);
    expect(request).toContain("2026-09-13");
    expect(request).not.toContain("2026-09-12");
  });
});

describe("the per-step log line", () => {
  const TODAY = "2026-09-12";
  const brief = weatherBriefFixture(TODAY);
  /** The five winter-wheat varieties the Crop Dictionary lists. */
  const ranked = ["Izvor", "Ursita", "Glosa", "Otilia", "Voinic"].map(
    (varietyName) => ({ varietyName, fit: 70, reasons: ["Motiv."] }),
  );

  let logs: string[];
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logs = [];
    spy = vi
      .spyOn(console, "log")
      .mockImplementation((line: unknown) => void logs.push(String(line)));
  });
  afterEach(() => spy.mockRestore());

  /** The one `[recommendation]` payload the step emitted. */
  function payload(): Record<string, unknown> {
    const line = logs.find((l) => l.startsWith("[recommendation] "));
    expect(line).toBeDefined();
    return JSON.parse(line!.slice("[recommendation] ".length)) as Record<
      string,
      unknown
    >;
  }

  function toolReply(name: string, input: unknown): Anthropic.Message {
    return {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "claude-haiku-4-5",
      content: [{ type: "tool_use", id: "t1", name, input }],
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    } as Anthropic.Message;
  }

  function serviceWith(create: ReturnType<typeof vi.fn>) {
    return createRecommendationService({
      createClient: () => ({ messages: { create } }) as never,
      weatherBriefSource: async () => brief,
      model: "claude-haiku-4-5",
      today: () => TODAY,
      logAiCall: async () => null,
    });
  }

  it("names the step, the model and every attempt of a successful crops call", async () => {
    const create = vi
      .fn()
      .mockResolvedValue(toolReply(CROP_TOOL_NAME, cropRecommendationFixture));

    await serviceWith(create).crops(profile);

    expect(payload()).toMatchObject({
      kind: "crops",
      fieldProfileId: "fp1",
      model: "claude-haiku-4-5",
      attempts: 1,
      stopReasons: ["tool_use"],
      errorName: null,
      issues: null,
    });
    expect(payload().weatherBriefMs).toBeGreaterThanOrEqual(0);
    expect(payload().totalMs).toBeGreaterThanOrEqual(0);
    expect(payload().modelMs).toHaveLength(1);
  });

  it("names the failure and both attempts when the output stays invalid", async () => {
    const create = vi.fn().mockResolvedValue(toolReply(CROP_TOOL_NAME, {}));

    await serviceWith(create)
      .crops(profile)
      .catch(() => undefined);

    expect(payload()).toMatchObject({
      kind: "crops",
      attempts: 2,
      stopReasons: ["tool_use", "tool_use"],
      errorName: "AiOutputError",
    });
    // One truncated Zod issues string per attempt (issue 0020): "top" missing.
    const issues = payload().issues as (string | null)[];
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatch(/"path":\["top"\]/);
    expect(issues[1]).toMatch(/"path":\["top"\]/);
  });

  it("logs zero attempts when the Weather Brief fails before the model", async () => {
    const svc = failingBriefService(() =>
      Promise.reject(new OpenMeteoUnavailableError("archive", 503, "down")),
    );

    await svc.crops(profile).catch(() => undefined);

    expect(payload()).toMatchObject({
      kind: "crops",
      attempts: 0,
      modelMs: [],
      stopReasons: [],
      errorName: "WeatherUnavailableError",
    });
  });

  it("carries the cropId and no Weather Brief timing on the varieties line", async () => {
    const create = vi
      .fn()
      .mockResolvedValue(
        toolReply(VARIETY_TOOL_NAME, { cropId: "grau_toamna", ranked }),
      );

    await serviceWith(create).varieties({
      profile,
      brief,
      cropId: "grau_toamna",
    });

    expect(payload()).toMatchObject({
      kind: "varieties",
      cropId: "grau_toamna",
      model: "claude-haiku-4-5",
      attempts: 1,
      errorName: null,
    });
    expect(payload()).not.toHaveProperty("weatherBriefMs");
  });
});
