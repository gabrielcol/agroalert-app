import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { cropRecommendationFixture } from "@/lib/agro/recommendation-fixture";
import { cropRecommendationSchema } from "@/lib/agro/recommendation-schema";
import {
  CROP_TOOL_NAME,
  cropRecommendationTool,
  parseToolInput,
  varietyRecommendationTool,
} from "./tools";

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
