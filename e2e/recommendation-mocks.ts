import type { Page, Route } from "@playwright/test";

/**
 * tRPC over httpBatchLink + superjson, mocked at the network edge so the
 * cultura / soi specs never call Anthropic or Open-Meteo. Each procedure is
 * matched by name in the batch URL and answered with a superjson envelope.
 */

type Json = Record<string, unknown>;

const TODAY = "2026-09-12";

function envelope(json: unknown, meta?: Json) {
  return { result: { data: meta ? { json, meta } : { json } } };
}

function errorEnvelope(message: string, code: string, httpStatus: number) {
  return {
    error: {
      json: { message, code: -32603, data: { code, httpStatus, path: "" } },
    },
  };
}

/** A minimal Weather Brief the record schema accepts (the screens don't read it). */
function weatherBriefStub() {
  const month = (m: number) => ({
    month: m,
    tMean: 10,
    tMin: 5,
    tMax: 15,
    precipSum: 40,
    et0: 50,
    waterBalance: -10,
  });
  const day = (i: number) => ({
    date: `2026-09-${String(13 + i).padStart(2, "0")}`,
    tMax: 24,
    tMin: 12,
    precipSum: 1,
    precipProbability: 20,
    et0: 3,
    waterBalance: -2,
    soilTemp0_9cm: 18,
    soilMoisture0_9cm: 0.2,
    windGustsMax: 30,
    snowfallSum: 0,
    weatherCode: 1,
  });
  return {
    today: TODAY,
    timezone: "Europe/Bucharest",
    units: "metric",
    location: { lat: 44.7, lng: 27.1 },
    climateProfile: {
      dataset: "ERA5-Land",
      span: { fromYear: 2016, toYear: 2025 },
      monthlyNormals: Array.from({ length: 12 }, (_, i) => month(i + 1)),
      frostHeat: {
        perYear: [
          {
            year: 2025,
            lastSpringFrost: "2025-04-01",
            firstAutumnFrost: "2025-11-01",
            frostDays: 50,
            daysOver30: 30,
            daysOver35: 5,
          },
        ],
        summary: {
          lastSpringFrostDoy: { mean: 91, spread: 10 },
          firstAutumnFrostDoy: { mean: 305, spread: 10 },
          frostDays: { mean: 50, spread: 10 },
          daysOver30: { mean: 30, spread: 10 },
          daysOver35: { mean: 5, spread: 4 },
        },
      },
      gdd: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        base5: 100,
        base10: 50,
      })),
      years: [
        {
          year: 2025,
          annualPrecip: 450,
          summerPrecip: 120,
          driest60DayWindow: {
            from: "2025-07-01",
            to: "2025-08-29",
            precipSum: 10,
          },
          droughtFlag: true,
        },
      ],
    },
    currentSeason: {
      year: 2026,
      throughDate: "2026-09-07",
      monthly: [
        {
          month: 9,
          tMean: 18,
          precipSum: 10,
          et0: 60,
          waterBalance: -50,
          anomaly: { tMean: 1, precipSum: -20 },
        },
      ],
      last30Days: [
        { date: "2026-09-07", tMax: 26, tMin: 13, precipSum: 0, et0: 3.5 },
      ],
    },
    forecast: {
      issuedAt: `${TODAY}T06:00:00+03:00`,
      trustedDays: 7,
      days: Array.from({ length: 16 }, (_, i) => day(i)),
    },
    seasonalOutlook: {
      dataset: "EC46",
      issuedAt: `${TODAY}T00:00:00+03:00`,
      weeks: [3, 4, 5, 6, 7].map((week) => ({
        week,
        from: TODAY,
        to: TODAY,
        tempAnomaly: 0.5,
        precipAnomaly: -5,
        label: "drier",
        confidence: "low",
      })),
    },
  };
}

export const CROP_RECOMMENDATION = {
  id: "rec_e2e",
  fieldProfileId: "fp_e2e",
  weatherBrief: weatherBriefStub(),
  result: {
    top: [
      {
        cropId: "grau_toamna",
        fit: 86,
        reasons: [
          "Solul cernoziom reține apa necesară răsăririi.",
          "Fereastra de semănat se deschide în două săptămâni.",
          "Al treilea motiv nu se afișează pe card.",
        ],
        risks: ["Toamna curentă este mai uscată decât media."],
        sowingWindow: { from: "2026-10-01", to: "2026-10-10" },
        recommendedVarietyIds: ["Glosa"],
        confidence: "high",
      },
      {
        cropId: "orz_toamna",
        fit: 78,
        reasons: ["Rezistă mai bine la secetă decât grâul."],
        risks: [],
        sowingWindow: { from: "2026-09-20", to: "2026-10-05" },
        recommendedVarietyIds: [],
        confidence: "medium",
      },
      {
        cropId: "rapita_toamna",
        fit: 55,
        reasons: ["Preț bun și eliberează terenul devreme."],
        risks: ["Fereastra de semănat aproape s-a închis."],
        sowingWindow: { from: "2026-09-01", to: "2026-09-15" },
        recommendedVarietyIds: [],
        confidence: "low",
      },
    ],
    excluded: [
      {
        cropId: "porumb",
        reason: "Se seamănă primăvara; următoarea fereastră este în aprilie.",
      },
      { cropId: "orez", reason: "Cere teren inundabil și irigare permanentă." },
    ],
  },
  modelId: "claude-sonnet-5",
  createdAt: "2026-09-12T10:00:00.000Z",
};

export const VARIETY_RECOMMENDATION = {
  id: "var_e2e",
  cropRecommendationId: "rec_e2e",
  cropId: "grau_toamna",
  result: {
    cropId: "grau_toamna",
    ranked: [
      {
        varietyName: "Glosa",
        fit: 90,
        reasons: ["Toleranță ridicată la secetă."],
      },
      {
        varietyName: "Izvor",
        fit: 84,
        reasons: ["Foarte rezistent la iernare."],
      },
      {
        varietyName: "Ursita",
        fit: 80,
        reasons: ["Rezistență foarte bună la ger."],
      },
      {
        varietyName: "Otilia",
        fit: 76,
        reasons: ["Randament bun în anii ploioși."],
      },
      {
        varietyName: "Voinic",
        fit: 70,
        reasons: ["Soi nou, date puține în zonă."],
      },
    ],
  },
  modelId: "claude-sonnet-5",
  createdAt: "2026-09-12T10:05:00.000Z",
};

/** A Sowing Plan (issue 0008) as the summary and dashboard receive it. */
export const SOWING_PLAN = {
  id: "sp_e2e",
  fieldProfileId: "fp_e2e",
  cropId: "grau_toamna",
  varietyName: "Voinic",
  sownAt: "2026-09-12T08:00:00.000Z",
  createdAt: "2026-09-12T08:00:00.000Z",
};
export const SOWING_PLAN_META = {
  values: { sownAt: ["Date"], createdAt: ["Date"] },
};
export const SOWING_PLAN_LIST_META = {
  values: { "0.sownAt": ["Date"], "0.createdAt": ["Date"] },
};

const DATE_META = { values: { createdAt: ["Date"] } };

export type ProcedureMock =
  | {
      ok: true;
      data: unknown;
      /** superjson meta; defaults to a top-level `createdAt` Date, `null` for none. */
      meta?: Json | null;
    }
  | { ok: false; message: string; code?: string; httpStatus?: number };

/**
 * Answer tRPC batch calls for the given procedures. Unmatched procedures fall
 * through to the real server.
 */
export async function mockRecommendation(
  page: Page,
  mocks: Record<string, ProcedureMock | (() => ProcedureMock)>,
) {
  await page.route("**/api/trpc/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const handled = procedures.map((name) => {
      const mock = mocks[name];
      return typeof mock === "function" ? mock() : mock;
    });
    if (handled.some((m) => !m)) return route.fallback();

    const body = handled.map((mock) => {
      if (!mock) throw new Error("unreachable");
      if (mock.ok) {
        const meta = mock.meta === undefined ? DATE_META : mock.meta;
        return envelope(mock.data, meta ?? undefined);
      }
      return errorEnvelope(
        mock.message,
        mock.code ?? "INTERNAL_SERVER_ERROR",
        mock.httpStatus ?? 500,
      );
    });
    const status = handled.every((m) => m?.ok) ? 200 : 500;
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
