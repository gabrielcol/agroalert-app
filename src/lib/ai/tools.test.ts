import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { cropRecommendationFixture } from "@/lib/agro/recommendation-fixture";
import { cropRecommendationSchema } from "@/lib/agro/recommendation-schema";
import {
  CROP_TOOL_NAME,
  cropRecommendationTool,
  normalizeCropInput,
  normalizeVarietyInput,
  parseToolInput,
  varietyRecommendationTool,
} from "./tools";

/** Every key used anywhere in a JSON schema tree. */
function keysDeep(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => keysDeep(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      out.add(k);
      keysDeep(v, out);
    }
  }
  return out;
}

describe("strict tool schemas (issue 0020)", () => {
  it("declares both tools strict, with descriptions and no unsupported keywords", () => {
    for (const tool of [cropRecommendationTool, varietyRecommendationTool]) {
      expect(tool.strict).toBe(true);
      const keys = keysDeep(tool.input_schema);
      for (const banned of [
        "minimum",
        "maximum",
        "minLength",
        "maxLength",
        "minItems",
        "maxItems",
        "pattern",
      ]) {
        expect(keys.has(banned), banned).toBe(false);
      }
      expect(keys.has("description")).toBe(true);
    }
  });

  it("closes every object and types the sowing window dates as `date`", () => {
    const schema = cropRecommendationTool.input_schema as {
      additionalProperties?: boolean;
      properties: {
        top: {
          items: {
            additionalProperties?: boolean;
            properties: {
              fit: { type: string; description: string };
              sowingWindow: { properties: { from: { format?: string } } };
            };
          };
        };
      };
    };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.top.items.additionalProperties).toBe(false);
    expect(schema.properties.top.items.properties.fit.type).toBe("integer");
    expect(schema.properties.top.items.properties.fit.description).toMatch(
      /0-100/,
    );
    expect(
      schema.properties.top.items.properties.sowingWindow.properties.from
        .format,
    ).toBe("date");
  });
});

describe("normalizeCropInput (issue 0020)", () => {
  const crop = cropRecommendationFixture.top[0];

  it("rounds and clamps fit, trims the lists and defaults the optional ones", () => {
    const out = normalizeCropInput({
      top: [
        {
          ...crop,
          fit: 86.5,
          reasons: ["a", "", "b", "c", "d", "e", "f"],
          risks: null,
          recommendedVarietyIds: undefined,
        },
        { ...crop, fit: -3 },
        { ...crop, fit: "101" },
        { ...crop, fit: 50 },
      ],
    }) as { top: Record<string, unknown>[]; excluded: unknown };
    expect(out.top).toHaveLength(3);
    expect(out.top[0]).toMatchObject({
      fit: 87,
      reasons: ["a", "b", "c", "d", "e"],
      risks: [],
      recommendedVarietyIds: [],
    });
    expect(out.top[1].fit).toBe(0);
    expect(out.top[2].fit).toBe(100);
    expect(out.excluded).toEqual([]);
    expect(cropRecommendationSchema.safeParse(out).success).toBe(true);
  });

  it("leaves what it cannot fix for Zod: a missing reasons list, a bad crop id, a non-object", () => {
    const out = normalizeCropInput({
      top: [{ ...crop, cropId: "grau", reasons: undefined }],
      excluded: [],
    });
    const parsed = cropRecommendationSchema.safeParse(out);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["top.0.cropId", "top.0.reasons"]),
    );
    expect(normalizeCropInput("prose")).toBe("prose");
    expect(normalizeCropInput({ top: "x" })).toMatchObject({ top: "x" });
  });

  it("gives the variety ranking the same fit and reasons care", () => {
    const out = normalizeVarietyInput({
      cropId: "grau_toamna",
      ranked: [
        {
          varietyName: "Glosa",
          fit: 90.2,
          reasons: ["a", "b", "c", "d", "e", "f"],
        },
      ],
    }) as { ranked: { fit: number; reasons: string[] }[] };
    expect(out.ranked[0].fit).toBe(90);
    expect(out.ranked[0].reasons).toHaveLength(5);
  });
});

describe("recommendation tools", () => {
  it("derives an object schema with the frozen top-level keys", () => {
    const schema = cropRecommendationTool.input_schema as {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties)).toEqual(["top", "excluded"]);
    expect(schema.required).toEqual(["top", "excluded"]);
    expect("$schema" in schema).toBe(false);
  });

  it("constrains cropId to the Crop Dictionary ids", () => {
    const schema = varietyRecommendationTool.input_schema as {
      properties: { cropId: { enum: string[] } };
    };
    expect(schema.properties.cropId.enum).toContain("grau_toamna");
    expect(schema.properties.cropId.enum).not.toContain("banane");
  });

  it("accepts a well-formed tool call", () => {
    const result = parseToolInput(
      {
        stop_reason: "tool_use",
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: CROP_TOOL_NAME,
            input: cropRecommendationFixture,
          } as Anthropic.ToolUseBlock,
        ],
      },
      CROP_TOOL_NAME,
      cropRecommendationSchema,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a malformed tool call without throwing", () => {
    const result = parseToolInput(
      {
        stop_reason: "tool_use",
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: CROP_TOOL_NAME,
            input: { top: [{ cropId: "banane", fit: 300 }], excluded: [] },
          } as Anthropic.ToolUseBlock,
        ],
      },
      CROP_TOOL_NAME,
      cropRecommendationSchema,
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("reports a missing tool call", () => {
    const result = parseToolInput(
      {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Nu pot.", citations: null }],
      },
      CROP_TOOL_NAME,
      cropRecommendationSchema,
    );
    expect(result).toEqual({ ok: false, reason: "no_tool_use" });
  });
});
