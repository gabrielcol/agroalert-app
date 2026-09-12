// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCaller } from "@/server/trpc/root";
import { AiOutputError, WeatherUnavailableError } from "@/lib/ai/errors";
import {
  setRecommendationService,
  type RecommendationService,
} from "@/lib/ai/service";
import {
  cropRecommendationFixture,
  varietyRecommendationFixture,
} from "@/lib/agro/recommendation-fixture";
import {
  cropRecommendationRecordSchema,
  varietyRecommendationRecordSchema,
} from "@/lib/agro/recommendation-schema";
import { FieldProfileNotFoundError } from "@/lib/weather";
import { weatherBriefFixture } from "@/lib/weather/fixture";
import { makeCtx } from "../../../../test/trpc";

const profileRow = {
  id: "fp1",
  villageName: "Reviga",
  lat: 44.68,
  lng: 27.11,
  landBucket: "medium",
  irrigation: false,
  soilClass: "cernoziom",
  createdAt: new Date("2026-09-12T10:00:00Z"),
};

const brief = weatherBriefFixture("2026-09-12");

const storedCrops = {
  id: "rec1",
  fieldProfileId: "fp1",
  weatherBrief: brief,
  result: cropRecommendationFixture,
  modelId: "claude-sonnet-5",
  createdAt: new Date("2026-09-12T10:05:00Z"),
};

function fakeDb(options: {
  profile?: typeof profileRow | null;
  crops?: typeof storedCrops | null;
  varieties?: unknown | null;
}) {
  const withProfile = options.crops === undefined ? null : options.crops;
  return {
    fieldProfile: {
      findUnique: vi.fn().mockResolvedValue(options.profile ?? null),
    },
    cropRecommendation: {
      findFirst: vi.fn().mockResolvedValue(options.crops ?? null),
      findUnique: vi
        .fn()
        .mockResolvedValue(
          withProfile ? { ...withProfile, fieldProfile: profileRow } : null,
        ),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "rec_new",
        createdAt: new Date("2026-09-12T11:00:00Z"),
        ...data,
      })),
    },
    varietyRecommendation: {
      findFirst: vi.fn().mockResolvedValue(options.varieties ?? null),
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "var_new",
        createdAt: new Date("2026-09-12T11:00:00Z"),
        ...data,
      })),
    },
  };
}

function fakeService(overrides: Partial<RecommendationService> = {}) {
  const service: RecommendationService = {
    crops: vi.fn().mockResolvedValue({
      brief,
      result: cropRecommendationFixture,
      modelId: "claude-sonnet-5",
    }),
    varieties: vi.fn().mockResolvedValue({
      result: varietyRecommendationFixture,
      modelId: "claude-sonnet-5",
    }),
    ...overrides,
  };
  setRecommendationService(service);
  return service;
}

afterEach(() => setRecommendationService(null));

describe("recommendation.crops", () => {
  it("calls the model once and persists the result with the Weather Brief snapshot", async () => {
    const db = fakeDb({ profile: profileRow });
    const service = fakeService();
    const caller = createCaller(makeCtx(db, null));

    const record = await caller.recommendation.crops({ fieldProfileId: "fp1" });

    expect(cropRecommendationRecordSchema.safeParse(record).success).toBe(true);
    expect(record.id).toBe("rec_new");
    expect(record.result.top[0].cropId).toBe("grau_toamna");
    expect(record.weatherBrief.today).toBe("2026-09-12");
    expect(record.modelId).toBe("claude-sonnet-5");
    expect(service.crops).toHaveBeenCalledWith(
      expect.objectContaining({ id: "fp1", soilClass: "cernoziom" }),
    );
    expect(db.cropRecommendation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fieldProfileId: "fp1",
        modelId: "claude-sonnet-5",
        result: cropRecommendationFixture,
      }),
    });
  });

  it("returns the stored recommendation without calling the model again", async () => {
    const db = fakeDb({ profile: profileRow, crops: storedCrops });
    const service = fakeService();
    const caller = createCaller(makeCtx(db, null));

    const record = await caller.recommendation.crops({ fieldProfileId: "fp1" });

    expect(record.id).toBe("rec1");
    expect(service.crops).not.toHaveBeenCalled();
    expect(db.cropRecommendation.create).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for an unknown profile", async () => {
    fakeService();
    const caller = createCaller(makeCtx(fakeDb({ profile: null }), null));
    await expect(
      caller.recommendation.crops({ fieldProfileId: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("maps the weather module's FieldProfileNotFoundError to NOT_FOUND", async () => {
    const db = fakeDb({ profile: profileRow });
    fakeService({
      crops: vi.fn().mockRejectedValue(new FieldProfileNotFoundError("fp1")),
    });
    const caller = createCaller(makeCtx(db, null));
    await expect(
      caller.recommendation.crops({ fieldProfileId: "fp1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.cropRecommendation.create).not.toHaveBeenCalled();
  });

  it("maps a missing Weather Brief to SERVICE_UNAVAILABLE and stores nothing", async () => {
    const db = fakeDb({ profile: profileRow });
    fakeService({
      crops: vi.fn().mockRejectedValue(new WeatherUnavailableError()),
    });
    const caller = createCaller(makeCtx(db, null));
    await expect(
      caller.recommendation.crops({ fieldProfileId: "fp1" }),
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "WEATHER_UNAVAILABLE",
    });
    expect(db.cropRecommendation.create).not.toHaveBeenCalled();
  });

  it("maps an invalid model output to a typed INTERNAL_SERVER_ERROR", async () => {
    const db = fakeDb({ profile: profileRow });
    fakeService({
      crops: vi.fn().mockRejectedValue(new AiOutputError("bad shape")),
    });
    const caller = createCaller(makeCtx(db, null));
    await expect(
      caller.recommendation.crops({ fieldProfileId: "fp1" }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI_INVALID_OUTPUT",
    });
  });
});

describe("recommendation.varieties", () => {
  it("ranks the chosen crop's varieties from the stored recommendation and persists them", async () => {
    const db = fakeDb({ profile: profileRow, crops: storedCrops });
    const service = fakeService();
    const caller = createCaller(makeCtx(db, null));

    const record = await caller.recommendation.varieties({
      cropRecommendationId: "rec1",
      cropId: "grau_toamna",
    });

    expect(varietyRecommendationRecordSchema.safeParse(record).success).toBe(
      true,
    );
    expect(record.cropId).toBe("grau_toamna");
    expect(record.result.ranked[0].varietyName).toBe("Glosa");
    expect(service.varieties).toHaveBeenCalledWith(
      expect.objectContaining({
        cropId: "grau_toamna",
        brief: expect.objectContaining({ today: "2026-09-12" }),
      }),
    );
    expect(db.varietyRecommendation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cropRecommendationId: "rec1",
        cropId: "grau_toamna",
      }),
    });
  });

  it("returns the stored ranking without a second model call", async () => {
    const stored = {
      id: "var1",
      cropRecommendationId: "rec1",
      cropId: "grau_toamna",
      result: varietyRecommendationFixture,
      modelId: "claude-sonnet-5",
      createdAt: new Date("2026-09-12T10:10:00Z"),
    };
    const db = fakeDb({
      profile: profileRow,
      crops: storedCrops,
      varieties: stored,
    });
    const service = fakeService();
    const caller = createCaller(makeCtx(db, null));

    const record = await caller.recommendation.varieties({
      cropRecommendationId: "rec1",
      cropId: "grau_toamna",
    });
    expect(record.id).toBe("var1");
    expect(service.varieties).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for an unknown recommendation", async () => {
    fakeService();
    const caller = createCaller(makeCtx(fakeDb({}), null));
    await expect(
      caller.recommendation.varieties({
        cropRecommendationId: "ghost",
        cropId: "grau_toamna",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a crop id outside the Crop Dictionary", async () => {
    fakeService();
    const caller = createCaller(makeCtx(fakeDb({}), null));
    await expect(
      caller.recommendation.varieties({
        cropRecommendationId: "rec1",
        // @ts-expect-error — exercising runtime validation
        cropId: "banane",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
