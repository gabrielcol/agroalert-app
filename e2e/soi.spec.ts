import { expect, test } from "@playwright/test";

import {
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Step 3 with the Variety Recommendation mocked at the tRPC edge. Written per
// issue 0006; the suite runs before a deploy (AGENTS.md rule 3).

const URL = "/plan/soi?profile=fp_e2e&rec=rec_e2e&crop=grau_toamna";

test("renders the full ranking with rank, fit and reasons", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.varieties": { ok: true, data: VARIETY_RECOMMENDATION },
  });
  await page.goto(URL);

  await expect(page.getByText("Pasul 3 din 4")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Soiuri de Grâu de toamnă potrivite" }),
  ).toBeVisible();

  const cards = page.getByRole("listitem");
  await expect(cards).toHaveCount(5);
  const glosa = page.getByRole("button", { name: /Glosa/ });
  await expect(glosa).toHaveAttribute("aria-pressed", "true");
  await expect(glosa).toContainText("#1");
  await expect(glosa).toContainText("Potrivire 90%");
  await expect(glosa).toContainText("Toleranță ridicată la secetă");
  await expect(glosa).toContainText("Recomandat");

  const voinic = page.getByRole("button", { name: /Voinic/ });
  await expect(voinic).toContainText("#5");
  await expect(voinic).not.toContainText("Recomandat");

  await voinic.click();
  await expect(page.getByRole("link", { name: "Vezi planul" })).toHaveAttribute(
    "href",
    "/plan/rezumat?profile=fp_e2e&rec=rec_e2e&crop=grau_toamna&variety=Voinic",
  );
});

test("shows the retry screen when the ranking fails", async ({ page }) => {
  await mockRecommendation(page, {
    "recommendation.varieties": {
      ok: false,
      message: "AI_INVALID_OUTPUT",
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
    },
  });
  await page.goto(URL);

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Nu am putut pregăti recomandarea");
  await expect(
    alert.getByRole("button", { name: "Încearcă din nou" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
});

test("without the crop in the URL it returns to the cultura step", async ({
  page,
}) => {
  await page.goto("/plan/soi?profile=fp_e2e");
  await expect(page).toHaveURL("/plan/cultura?profile=fp_e2e");
});
