import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// The public AgroAlert shell: no session, Romanian by default. The wizard is
// walked against tRPC mocked at the network edge (issue 0007), so the suite
// makes no Open-Meteo or Anthropic call: geocoding, Field Profile creation and
// both recommendations are answered by page.route.

const PROFILE = {
  id: CROP_RECOMMENDATION.fieldProfileId,
  villageName: "Reviga, Comuna Reviga, Ialomița",
  lat: 44.68,
  lng: 27.1,
  landBucket: "large",
  irrigation: false,
  soilClass: "unknown",
  createdAt: "2026-09-12T10:00:00.000Z",
};

const CULTURA_URL = `/plan/cultura?profile=${PROFILE.id}`;
const SOI_URL = `/plan/soi?profile=${PROFILE.id}&rec=${CROP_RECOMMENDATION.id}&crop=grau_toamna`;
const REZUMAT_URL = `${SOI_URL.replace("/plan/soi", "/plan/rezumat")}&variety=Voinic`;

async function mockWizard(page: Page) {
  await mockRecommendation(page, {
    "geocode.search": {
      ok: true,
      data: [{ name: PROFILE.villageName, lat: PROFILE.lat, lng: PROFILE.lng }],
      meta: null,
    },
    "fieldProfile.create": { ok: true, data: PROFILE },
    "recommendation.crops": { ok: true, data: CROP_RECOMMENDATION },
    "recommendation.varieties": { ok: true, data: VARIETY_RECOMMENDATION },
  });
}

test("the dashboard is public and shows the sample plan", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Culturile tale" }),
  ).toBeVisible();
  await expect(page.getByText("Porumb · P0216")).toBeVisible();
  await expect(page.getByText("Alerte active")).toBeVisible();
  // Auth is hidden: nothing on the public screen points at sign-in.
  await expect(
    page.getByRole("link", { name: /sign in|autentific/i }),
  ).toHaveCount(0);
});

test("the add-crop wizard walks all four steps and subscribes to alerts", async ({
  page,
}) => {
  await mockWizard(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Adaugă o cultură nouă" }).click();

  // Step 1 — Field Profile. Defaults match the design's pre-selected options.
  await expect(page).toHaveURL("/plan/teren");
  await expect(page.getByText("Pasul 1 din 4")).toBeVisible();
  await expect(page.getByRole("radio", { name: "5–10 ha" })).toHaveAttribute(
    "data-state",
    "on",
  );
  await page.getByRole("radio", { name: "10+ ha" }).click();
  await expect(page.getByRole("radio", { name: "10+ ha" })).toHaveAttribute(
    "data-state",
    "on",
  );
  await expect(page.getByRole("radio", { name: "Nu știu" })).toHaveAttribute(
    "data-state",
    "on",
  );
  await page.getByLabel("Sat / comună").fill("Reviga");
  await page.getByRole("button", { name: "Continuă" }).click();

  // The loader runs while the (mocked) recommendation resolves, then lands on
  // step 2 carrying the Field Profile id. Generous timeout: under `next dev`
  // the first navigation compiles the route on demand.
  await expect(page).toHaveURL(CULTURA_URL, { timeout: 20_000 });
  await expect(page.getByText("Pasul 2 din 4")).toBeVisible();

  // Step 2 — Crop Recommendation: rank 1 is pre-selected and badged.
  const wheat = page.getByRole("button", { name: /Grâu de toamnă/ });
  const barley = page.getByRole("button", { name: /Orz de toamnă/ });
  await expect(wheat).toHaveAttribute("aria-pressed", "true");
  await expect(wheat).toContainText("Recomandat");
  await expect(wheat).toContainText("Potrivire 86%");
  await barley.click();
  await expect(barley).toHaveAttribute("aria-pressed", "true");
  await expect(wheat).toHaveAttribute("aria-pressed", "false");

  // The crops the model set aside are one tap away, with their reason.
  await page.getByRole("button", { name: "Alte culturi" }).click();
  await expect(page.getByText("Se seamănă primăvara")).toBeVisible();

  // Back to wheat so step 3 ranks its varieties.
  await wheat.click();
  await page.getByRole("link", { name: "Continuă" }).click();

  // Step 3 — Variety Recommendation for the chosen crop.
  await expect(page).toHaveURL(SOI_URL);
  await expect(page.getByText("Pasul 3 din 4")).toBeVisible();
  const glosa = page.getByRole("button", { name: /Glosa/ });
  await expect(glosa).toHaveAttribute("aria-pressed", "true");
  await expect(glosa).toContainText("#1");
  await page.getByRole("button", { name: /Voinic/ }).click();
  await page.getByRole("link", { name: "Vezi planul" }).click();

  // Step 4 — the plan: one alerts card with all three rows.
  await expect(page).toHaveURL(REZUMAT_URL);
  await expect(page.getByText("Pasul 4 din 4")).toBeVisible();
  await expect(page.getByText("25 sept – 15 oct")).toBeVisible();
  await expect(page.getByText("Alerte pentru zona ta")).toHaveCount(1);
  await expect(
    page.getByText("Momentan: niciun cod de avertizare ANM în zonă"),
  ).toBeVisible();

  // Subscribing to the plan's alerts is confirmed with a toast; the button
  // then locks into its "Abonat" state and a way back to the dashboard shows.
  await page.getByRole("button", { name: "Abonează-mă la alerte" }).click();
  await expect(page.getByText("Te-ai abonat la alerte")).toBeVisible();
  await expect(
    page.getByText("Te anunțăm când apar schimbări pentru zona ta."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Abonat" })).toBeDisabled();

  await page.getByRole("link", { name: "Înapoi la culturile tale" }).click();
  await expect(page).toHaveURL("/");
});

// The phone chrome: the header sticks to the top of the phone column and the
// action bar to its bottom, so the next tap is on screen whatever the scroll
// position. Asserted at a real phone viewport — the default project runs a
// desktop window, where every screen fits without scrolling.
test("at phone size the header and the plan CTA stay on screen", async ({
  page,
}) => {
  const height = 600;
  await page.setViewportSize({ width: 390, height });
  await page.goto("/plan/rezumat");

  const header = page.getByRole("banner");
  const cta = page.getByRole("button", { name: "Abonează-mă la alerte" });
  const cardBody = page.getByText(
    "Te anunțăm despre secetă, ploi potrivite și avertizări ANM",
  );

  async function box(locator: Locator) {
    const found = await locator.boundingBox();
    expect(found, "element has no layout box").not.toBeNull();
    return found!;
  }

  // The summary is taller than the viewport — otherwise the test proves nothing.
  const scrollHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  expect(scrollHeight).toBeGreaterThan(height);

  // Top of the page: both are already on screen, unscrolled.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const headerTop = await box(header);
  expect(headerTop.y).toBeGreaterThanOrEqual(0);
  expect(headerTop.y + headerTop.height).toBeLessThanOrEqual(height);
  const ctaTop = await box(cta);
  expect(ctaTop.y).toBeGreaterThanOrEqual(0);
  expect(ctaTop.y + ctaTop.height).toBeLessThanOrEqual(height);

  // Bottom of the page: they have not scrolled away, and the last of the
  // scrolling content sits above the bar rather than behind it.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  const headerBottom = await box(header);
  expect(headerBottom.y).toBeGreaterThanOrEqual(0);
  expect(headerBottom.y + headerBottom.height).toBeLessThanOrEqual(height);
  const ctaBottom = await box(cta);
  expect(ctaBottom.y).toBeGreaterThanOrEqual(0);
  expect(ctaBottom.y + ctaBottom.height).toBeLessThanOrEqual(height);

  const body = await box(cardBody);
  expect(body.y + body.height).toBeLessThanOrEqual(ctaBottom.y);

  // The bar keeps holding the action after subscribing, plus the way back.
  await cta.click();
  await expect(page.getByRole("button", { name: "Abonat" })).toBeDisabled();
  const back = await box(
    page.getByRole("link", { name: "Înapoi la culturile tale" }),
  );
  expect(back.y + back.height).toBeLessThanOrEqual(height);
});

test("the wizard back arrows follow the step order", async ({ page }) => {
  await mockWizard(page);
  await page.goto(SOI_URL);
  await page.getByRole("link", { name: "Înapoi" }).click();
  await expect(page).toHaveURL(CULTURA_URL);
  await page.getByRole("link", { name: "Înapoi" }).click();
  await expect(page).toHaveURL("/plan/teren");
  await page.getByRole("link", { name: "Înapoi" }).click();
  await expect(page).toHaveURL("/");

  // The plan summary leaves the wizard entirely.
  await page.goto("/plan/rezumat");
  await page.getByRole("link", { name: "Înapoi" }).click();
  await expect(page).toHaveURL("/");
});

test("the old landing page is gone and admin stays guarded", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/sign-in");
});
