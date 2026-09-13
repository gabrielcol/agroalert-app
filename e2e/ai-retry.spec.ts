import { expect, test } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Issue 0018 — the AI call timeout and the server-side correction retry.
//
// The retry itself is NOT asserted here, and cannot be: the recommendation leg
// is mocked at the tRPC network edge (see recommendation-mocks.ts), so the
// browser never reaches the server procedure and `loggedCreateWithRetry` never
// runs. Exercising the correction turn needs a real Anthropic key and a model
// that answers badly on purpose — the unit tests in
// `src/lib/ai/recommend.test.ts` cover it instead.
//
// What this spec guards is the user-visible contract around the change: an
// `AI_UNAVAILABLE` failure (which is what a call that exhausts the 60 s
// timeout and its one SDK retry now surfaces as) still reaches the AI retry
// copy on both steps, and the step still recovers when the retry succeeds.
//
// Written per AGENTS.md rule 3; the suite runs before a deploy, not per PR.

const CULTURA_URL = `/plan/cultura?profile=${CROP_RECOMMENDATION.fieldProfileId}`;
const SOI_URL = `/plan/soi?profile=${CROP_RECOMMENDATION.fieldProfileId}&rec=${CROP_RECOMMENDATION.id}&crop=grau_toamna`;

const AI_FAILURE = {
  ok: false as const,
  message: "AI_UNAVAILABLE",
  code: "INTERNAL_SERVER_ERROR",
  httpStatus: 500,
};

test("cultura shows the AI retry copy on AI_UNAVAILABLE and recovers on retry", async ({
  page,
}) => {
  let calls = 0;
  await mockRecommendation(page, {
    "recommendation.crops": () =>
      calls++ === 0 ? AI_FAILURE : { ok: true, data: CROP_RECOMMENDATION },
  });
  await page.goto(CULTURA_URL);

  // Next's route announcer is also role=alert; the retry card is the shadcn one.
  const alert = page.locator('[role="alert"][data-slot="alert"]');
  await expect(alert).toContainText("Nu am putut pregăti recomandarea");
  await expect(alert).not.toContainText("Nu am putut citi vremea");
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);

  await alert.getByRole("button", { name: "Încearcă din nou" }).click();
  await expect(
    page.getByRole("button", { name: /Grâu de toamnă/ }),
  ).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test("soi shows the AI retry copy on AI_UNAVAILABLE", async ({ page }) => {
  await mockRecommendation(page, { "recommendation.varieties": AI_FAILURE });
  await page.goto(SOI_URL);

  const alert = page.locator('[role="alert"][data-slot="alert"]');
  await expect(alert).toContainText("Nu am putut pregăti recomandarea");
  await expect(
    alert.getByRole("button", { name: "Încearcă din nou" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
});

test("soi recovers on retry once the AI call succeeds", async ({ page }) => {
  let calls = 0;
  await mockRecommendation(page, {
    "recommendation.varieties": () =>
      calls++ === 0 ? AI_FAILURE : { ok: true, data: VARIETY_RECOMMENDATION },
  });
  await page.goto(SOI_URL);

  const alert = page.locator('[role="alert"][data-slot="alert"]');
  await alert.getByRole("button", { name: "Încearcă din nou" }).click();

  await expect(page.getByRole("button", { name: /Glosa/ })).toContainText("#1");
  await expect(alert).toHaveCount(0);
});
