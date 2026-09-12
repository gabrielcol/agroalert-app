import type {
  CropRecommendation,
  VarietyRecommendation,
} from "./recommendation-schema";

/**
 * Plausible recommendation outputs for a field near Reviga in mid-September.
 * Used by the stub `recommendation.*` procedures until issue 0006 calls the
 * model, and by contract tests. Not real advice.
 */

export const cropRecommendationFixture: CropRecommendation = {
  top: [
    {
      cropId: "grau_toamna",
      fit: 86,
      reasons: [
        "Solul cernoziom reține apa necesară răsăririi.",
        "Fereastra de semănat se deschide în două săptămâni, iar prognoza aduce ploaie înainte.",
        "În ultimii zece ani toamnele din zonă au fost potrivite pentru grâu.",
      ],
      risks: ["Toamna curentă este mai uscată decât media cu 30%."],
      sowingWindow: { from: "2026-10-01", to: "2026-10-10" },
      recommendedVarietyIds: ["Glosa", "Izvor"],
      confidence: "high",
    },
    {
      cropId: "orz_toamna",
      fit: 78,
      reasons: [
        "Rezistă mai bine la secetă decât grâul.",
        "Se seamănă puțin mai devreme, chiar în fereastra prognozei de 16 zile.",
      ],
      risks: ["O iarnă grea îl afectează mai mult decât pe grâu."],
      sowingWindow: { from: "2026-09-20", to: "2026-10-05" },
      recommendedVarietyIds: [],
      confidence: "medium",
    },
    {
      cropId: "rapita_toamna",
      fit: 55,
      reasons: ["Preț bun și eliberează terenul devreme."],
      risks: [
        "Fereastra de semănat aproape s-a închis.",
        "Fără irigare, prognoza aduce prea puțină ploaie pentru răsărire.",
      ],
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
    {
      cropId: "orez",
      reason: "Cere teren inundabil și irigare permanentă.",
    },
  ],
};

export const varietyRecommendationFixture: VarietyRecommendation = {
  cropId: "grau_toamna",
  ranked: [
    {
      varietyName: "Glosa",
      fit: 90,
      reasons: [
        "Toleranță ridicată la secetă, potrivită anilor uscați din zonă.",
        "Randamente stabile pe sol greu, fără irigare.",
      ],
    },
    {
      varietyName: "Izvor",
      fit: 84,
      reasons: ["Foarte rezistent la secetă și la iernare."],
    },
    {
      varietyName: "Otilia",
      fit: 76,
      reasons: ["Randament mare în anii cu ploi de primăvară."],
    },
  ],
};
