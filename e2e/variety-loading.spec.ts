import { expect, test } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Issue 0022 — picking a crop fires the varieties model call, which takes tens
// of seconds live. The step has to say so instead of showing bare placeholders.
// The call is mocked at the tRPC edge and held back (`delayMs`) so the loading
// state is observable. Written per AGENTS.md rule 3; the suite runs before a
// deploy, not per PR.

const CULTURA_URL = `/plan/cultura?profile=${CROP_RECOMMENDATION.fieldProfileId}`;
const LOADING = "Se încarcă soiurile…";

test("choosing a crop shows the varieties loading state until the ranking lands", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.crops": { ok: true, data: CROP_RECOMMENDATION },
    "recommendation.varieties": {
      ok: true,
      data: VARIETY_RECOMMENDATION,
      delayMs: 2_000,
    },
  });
  await page.goto(CULTURA_URL);

  await page.getByRole("button", { name: /Grâu de toamnă/ }).click();
  await page.getByRole("link", { name: "Continuă" }).click();

  const status = page.getByRole("status").filter({ hasText: LOADING });
  await expect(status).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();

  await expect(page.getByRole("button", { name: /Glosa/ })).toBeVisible();
  await expect(status).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test("a failed varieties call shows the retry screen and no loading state", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.varieties": {
      ok: false,
      message: "AI_UNAVAILABLE",
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
      delayMs: 500,
    },
  });
  await page.goto(
    `/plan/soi?profile=${CROP_RECOMMENDATION.fieldProfileId}&rec=${CROP_RECOMMENDATION.id}&crop=grau_toamna`,
  );

  await expect(page.locator('[role="alert"][data-slot="alert"]')).toContainText(
    "Nu am putut pregăti recomandarea",
  );
  await expect(page.getByText(LOADING)).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});
