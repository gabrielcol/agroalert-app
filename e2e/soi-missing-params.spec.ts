import { expect, test } from "@playwright/test";

// Issue 0021 — the variety screen must never render a blank area. With
// `profile`, `rec` or `crop` missing from the URL the varieties query is
// disabled, so nothing is in flight and nothing used to render between the
// heading and the disabled CTA. The screen now shows a not-ready notice with a
// way back while the redirect to the previous step runs.
//
// Written per AGENTS.md rule 3; the suite runs before a deploy, not per PR.

const NOT_READY = "soi-not-ready";

test("the missing-param screen shows a notice, never a blank area", async ({
  page,
}) => {
  // The redirect to the crop step is held back so the not-ready state stays on
  // screen long enough to assert on; without this the navigation can commit
  // before the first assertion runs.
  await page.route("**/plan/cultura**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.continue();
  });

  await page.goto("/plan/soi?profile=fp_e2e");

  const notice = page.getByTestId(NOT_READY);
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Ne lipsesc câteva date");
  await expect(
    notice.getByRole("link", { name: "Înapoi la pasul anterior" }),
  ).toHaveAttribute("href", "/plan/cultura?profile=fp_e2e");
  // Nothing pretends to be a ranking: no variety card is selected.
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Vezi planul" })).toHaveCount(0);
});

test("the way back on the notice reaches the crop step", async ({ page }) => {
  await page.route("**/plan/cultura**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.continue();
  });

  await page.goto("/plan/soi?profile=fp_e2e&rec=rec_e2e");

  await page
    .getByTestId(NOT_READY)
    .getByRole("link", { name: "Înapoi la pasul anterior" })
    .click();
  await expect(page).toHaveURL("/plan/cultura?profile=fp_e2e");
});

test("with no params at all it says so and returns to the first step", async ({
  page,
}) => {
  await page.route("**/plan/teren**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.continue();
  });

  await page.goto("/plan/soi");

  const notice = page.getByTestId(NOT_READY);
  await expect(notice).toBeVisible();
  await expect(
    notice.getByRole("link", { name: "Înapoi la pasul anterior" }),
  ).toHaveAttribute("href", "/plan/teren");

  await page.unroute("**/plan/teren**");
  await expect(page).toHaveURL("/plan/teren", { timeout: 20_000 });
});
