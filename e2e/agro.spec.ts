import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  CROP_RECOMMENDATION,
  SOWING_PLAN,
  SOWING_PLAN_LIST_META,
  SOWING_PLAN_META,
  VARIETY_RECOMMENDATION,
  mockRecommendation,
} from "./recommendation-mocks";

// The public AgroPlan shell: no session, Romanian by default. The wizard is
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
    "weather.climate": {
      ok: true,
      data: { cellId: "44.6,27.1", refreshed: true },
    },
    "weather.forecast": {
      ok: true,
      data: { cellId: "44.6,27.1", refreshed: true },
    },
    "recommendation.crops": { ok: true, data: CROP_RECOMMENDATION },
    "recommendation.varieties": { ok: true, data: VARIETY_RECOMMENDATION },
    // No Sowing Plan yet; confirming "Ai semănat azi?" creates one.
    "sowingPlan.latestByProfile": { ok: true, data: null, meta: null },
    "sowingPlan.markSown": {
      ok: true,
      data: SOWING_PLAN,
      meta: SOWING_PLAN_META,
    },
  });
}

test("the dashboard is public and shows the empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Culturile tale" }),
  ).toBeVisible();
  await expect(page.getByText("Nicio cultură adăugată încă")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Adaugă o cultură nouă" }),
  ).toBeVisible();
  // Auth is hidden: nothing on the public screen points at sign-in.
  await expect(
    page.getByRole("link", { name: /sign in|autentific/i }),
  ).toHaveCount(0);
});

test("the dashboard lists the Sowing Plans this browser created", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      "agro.sowingPlanIds",
      JSON.stringify(["sp_e2e"]),
    ),
  );
  await mockRecommendation(page, {
    "sowingPlan.byIds": {
      ok: true,
      data: [SOWING_PLAN],
      meta: SOWING_PLAN_LIST_META,
    },
  });
  await page.goto("/");

  const row = page.getByRole("link", { name: /Grâu de toamnă · Voinic/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Semănat 12 septembrie 2026");
  await expect(row).toContainText(/Urmează: .+ (în \d+ zile|azi)/);
  await expect(row).toHaveAttribute(
    "href",
    "/plan/rezumat?profile=fp_e2e&crop=grau_toamna&variety=Voinic",
  );
});

test("the add-crop wizard walks all four steps and records the Sowing Date", async ({
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

  // Step 4 — the plan: the crop · variety title, the Crop Calendar timeline
  // (dimmed, day offsets, a hint on the first Stage) and the alerts card.
  await expect(page).toHaveURL(REZUMAT_URL);
  await expect(page.getByText("Pasul 4 din 4")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Grâu de toamnă · Voinic" }),
  ).toBeVisible();
  await expect(page.getByText("25 sept – 15 oct")).toBeVisible();
  await expect(page.getByText("Ziua 0")).toBeVisible();
  await expect(page.getByText("+10 zile")).toBeVisible();
  await expect(
    page.getByText(
      "Apasă „Marchează semănat” mai jos și datele se completează",
    ),
  ).toBeVisible();
  await expect(page.getByText("Alertele sunt active")).toHaveCount(1);
  await expect(
    page.getByText("Momentan: niciun cod de avertizare ANM în zonă"),
  ).toBeVisible();

  // Confirming the Sowing Date happens inline in the sticky bar; the Sowing
  // Plan is created, a toast confirms, the dates fill in and the bar becomes
  // the way back to the dashboard.
  await page.getByRole("button", { name: "Marchează semănat" }).click();
  await expect(page.getByText("Ai semănat azi?")).toBeVisible();
  await page.getByRole("button", { name: "Confirmă" }).click();
  await expect(page.getByText("Semănat pe 12 septembrie 2026")).toHaveCount(2); // toast + node
  await expect(
    page.getByText("Alertele sunt active pentru această cultură."),
  ).toBeVisible();
  await expect(page.getByText("22 septembrie 2026")).toBeVisible();

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
  // The bar only renders with the wizard params (a plan to mark as sown).
  await mockWizard(page);
  await page.goto(REZUMAT_URL);

  const header = page.getByRole("banner");
  const cta = page.getByRole("button", { name: "Marchează semănat" });
  const cardBody = page.getByText("Verificat azi");

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

  // The inline confirm and, once sown, the way back stay in the bar.
  await expect(cta).toBeEnabled();
  await cta.click();
  const confirm = await box(page.getByRole("button", { name: "Confirmă" }));
  expect(confirm.y + confirm.height).toBeLessThanOrEqual(height);
  await page.getByRole("button", { name: "Confirmă" }).click();
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
