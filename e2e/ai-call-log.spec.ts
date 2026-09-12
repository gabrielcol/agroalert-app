import { expect, test } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Issue 0013 — the AI call log.
//
// The `ai_call` row itself is NOT asserted here, and cannot be: the whole
// recommendation leg is mocked at the tRPC network edge (see
// recommendation-mocks.ts), so the browser never reaches the server procedure,
// `recommendCrops` / `rankVarieties` never run, and no Anthropic call — hence
// no `ai_call` row — is ever produced. Asserting the row would need a real
// Anthropic key and a real API call in CI, which the suite deliberately avoids.
// What this spec does guard is that the new code path (the procedures now
// return an `aiCallId` and link the row after persisting) did not change the
// contract the screens read: both recommendation steps still render end to end.
//
// Written per AGENTS.md rule 3; the suite runs before a deploy, not per PR.

const CULTURA_URL = `/plan/cultura?profile=${CROP_RECOMMENDATION.fieldProfileId}`;
const SOI_URL = `/plan/soi?profile=${CROP_RECOMMENDATION.fieldProfileId}&rec=${CROP_RECOMMENDATION.id}&crop=grau_toamna`;

test("the Crop Recommendation still renders with the call-log code path in place", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.crops": { ok: true, data: CROP_RECOMMENDATION },
  });
  await page.goto(CULTURA_URL);

  await expect(page.getByText("Pasul 2 din 4")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Grâu de toamnă/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the Variety Recommendation still renders with the call-log code path in place", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.varieties": { ok: true, data: VARIETY_RECOMMENDATION },
  });
  await page.goto(SOI_URL);

  await expect(page.getByText("Pasul 3 din 4")).toBeVisible();
  await expect(page.getByRole("button", { name: /Glosa/ })).toContainText("#1");
});

test("a failing recommendation still reaches the retry screen (the row is written server-side)", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.crops": {
      ok: false,
      message: "AI_INVALID_OUTPUT",
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
    },
  });
  await page.goto(CULTURA_URL);

  // Next's route announcer is also role=alert; the retry card is the shadcn one.
  const alert = page.locator('[role="alert"][data-slot="alert"]');
  await expect(alert).toBeVisible();
});
