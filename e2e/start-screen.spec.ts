import { expect, test } from "@playwright/test";

// The start screen (issue 0014): `/` opens on the brand-green splash with the
// AgroPlan lockup and a mock progress bar, then hands over to "Culturile tale"
// on its own — no tap. Deep links into the wizard never show it.

test("the home screen opens on the splash and continues to the dashboard", async ({
  page,
}) => {
  await page.goto("/");

  const splash = page.getByTestId("start-screen");
  await expect(splash).toBeVisible();
  await expect(splash.getByRole("img", { name: "AgroPlan" })).toBeVisible();
  // Forest green from the artwork, kept in both themes.
  await expect(splash).toHaveCSS("background-color", "rgb(31, 77, 42)");

  // No interaction: the dashboard replaces it once the bar fills (~2.25s).
  await expect(
    page.getByRole("heading", { name: "Culturile tale" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(splash).toHaveCount(0);
});

test("deep links into the wizard never show the splash", async ({ page }) => {
  await page.goto("/plan/teren");
  await expect(page.getByText("Pasul 1 din 4")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("start-screen")).toHaveCount(0);
});
