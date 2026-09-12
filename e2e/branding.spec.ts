import { expect, test } from "@playwright/test";

// Branding (issue 0010): the phone header carries the AgroPlan lockup and the
// document title is the product name. No session, no tRPC call — the public
// dashboard renders the header before any data arrives.

test.describe("AgroPlan branding", () => {
  test("the phone header shows the AgroPlan lockup", async ({ page }) => {
    await page.goto("/");

    const brand = page.getByTestId("brand");
    await expect(brand).toBeVisible();
    await expect(brand.locator("svg")).toBeVisible();
    await expect(brand).toContainText("AgroPlan");
  });

  test("the document title is AgroPlan", async ({ page }) => {
    await page.goto("/");
    expect(await page.title()).toContain("AgroPlan");
  });
});
