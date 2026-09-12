import { expect, test } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// Step 2 with the Crop Recommendation mocked at the tRPC edge: no Anthropic or
// Open-Meteo call runs in CI. Written per issue 0006; the suite runs before a
// deploy (AGENTS.md rule 3).

test("renders the top 3 with fit, reasons, a Recommended badge and the collapsed rest", async ({
  page,
}) => {
  await mockRecommendation(page, {
    "recommendation.crops": { ok: true, data: CROP_RECOMMENDATION },
  });
  await page.goto("/plan/cultura?profile=fp_e2e");

  await expect(page.getByText("Pasul 2 din 4")).toBeVisible();
  const cards = page.getByRole("button", { pressed: true });
  await expect(cards).toHaveCount(1);

  const wheat = page.getByRole("button", { name: /Grâu de toamnă/ });
  const barley = page.getByRole("button", { name: /Orz de toamnă/ });
  const rapeseed = page.getByRole("button", { name: /Rapiță/ });
  await expect(wheat).toHaveAttribute("aria-pressed", "true");
  await expect(barley).toBeVisible();
  await expect(rapeseed).toBeVisible();
  await expect(page.getByRole("button", { name: /Porumb/ })).toHaveCount(0);

  // Fit, the first two reasons, the risks and the badge on rank 1 only.
  await expect(wheat).toContainText("Potrivire 86%");
  await expect(wheat).toContainText("Solul cernoziom reține apa");
  await expect(wheat).toContainText("Fereastra de semănat se deschide");
  await expect(wheat).not.toContainText("Al treilea motiv");
  await expect(wheat).toContainText("Toamna curentă este mai uscată");
  await expect(wheat).toContainText("Recomandat");
  await expect(barley).not.toContainText("Recomandat");
  await expect(wheat).toContainText("Fereastra de semănat: 1 oct. – 10 oct.");

  // Picking barley moves the selection and the continue link carries it.
  await barley.click();
  await expect(barley).toHaveAttribute("aria-pressed", "true");
  await expect(wheat).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("link", { name: "Continuă" })).toHaveAttribute(
    "href",
    "/plan/soi?profile=fp_e2e&rec=rec_e2e&crop=orz_toamna",
  );

  // "Alte culturi" reveals the excluded crops with their reasons.
  const others = page.getByRole("button", { name: "Alte culturi" });
  await expect(page.getByText("Se seamănă primăvara")).toBeHidden();
  await others.click();
  await expect(page.getByText("Porumb")).toBeVisible();
  await expect(page.getByText("Se seamănă primăvara")).toBeVisible();
  await expect(page.getByText("Orez")).toBeVisible();
});

test("shows the retry screen when the recommendation fails, and recovers on retry", async ({
  page,
}) => {
  let calls = 0;
  await mockRecommendation(page, {
    "recommendation.crops": () =>
      calls++ === 0
        ? {
            ok: false,
            message: "WEATHER_UNAVAILABLE",
            code: "SERVICE_UNAVAILABLE",
            httpStatus: 503,
          }
        : { ok: true, data: CROP_RECOMMENDATION },
  });
  await page.goto("/plan/cultura?profile=fp_e2e");

  // Next's route announcer is also role=alert; the retry card is the shadcn one.
  const alert = page.locator('[role="alert"][data-slot="alert"]');
  await expect(alert).toContainText("Nu am putut citi vremea");
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continuă" })).toBeDisabled();

  await alert.getByRole("button", { name: "Încearcă din nou" }).click();
  await expect(
    page.getByRole("button", { name: /Grâu de toamnă/ }),
  ).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test("without a profile in the URL it returns to the teren step", async ({
  page,
}) => {
  await page.goto("/plan/cultura");
  await expect(page).toHaveURL("/plan/teren");
});
