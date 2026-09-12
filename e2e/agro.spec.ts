import { expect, test, type Locator } from "@playwright/test";

// The public AgroAlert shell: no session, Romanian by default. These specs
// walk the design as a browsable prototype — navigation, selection states and
// the staged loading screen — without any backend behaviour.

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
  await page.goto("/");
  await page.getByRole("link", { name: "Adaugă o cultură nouă" }).click();

  // Step 1 — land profile. Defaults match the design's pre-selected options.
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
  await page.getByLabel("Sat / comună").fill("Reviga, Ialomița");
  await page.getByRole("button", { name: "Continuă" }).click();

  // Loading screen plays its five steps (~4 s), then lands on step 2. Generous
  // timeout: under `next dev` the first navigation compiles the route on demand.
  await expect(page.getByText("Pregătim recomandarea")).toBeVisible();
  await expect(
    page.getByText("Preluăm datele meteorologice din ultimii ani"),
  ).toBeVisible();
  await expect(page.getByText("Creăm lista pentru tine")).toBeVisible();
  await expect(page).toHaveURL("/plan/cultura", { timeout: 20_000 });
  await expect(page.getByText("Pasul 2 din 4")).toBeVisible();

  // Step 2 — crops. Wheat is recommended and pre-selected; pick barley.
  const wheat = page.getByRole("button", { name: /Grâu de toamnă/ });
  const barley = page.getByRole("button", { name: /^Orz/ });
  await expect(wheat).toHaveAttribute("aria-pressed", "true");
  await barley.click();
  await expect(barley).toHaveAttribute("aria-pressed", "true");
  await expect(wheat).toHaveAttribute("aria-pressed", "false");

  // Every card says why it is suggested; only the risky ones carry a caution.
  await expect(
    page.getByText("Fereastră largă: 25 sept – 15 oct"),
  ).toBeVisible();
  await expect(
    page.getByText("Semănatul târziu sau toamna secetoasă îi strică răsărirea"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continuă" }).click();

  // Step 3 — varieties.
  await expect(page).toHaveURL("/plan/soi");
  await expect(page.getByText("Pasul 3 din 4")).toBeVisible();
  await expect(page.getByRole("button", { name: /Glosa/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByText("Merge pe sol greu, chiar și fără irigare"),
  ).toBeVisible();
  await expect(
    page.getByText("Rezistență medie la secetă — riscant fără irigare"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vezi planul" }).click();

  // Step 4 — the plan: one alerts card with all three rows.
  await expect(page).toHaveURL("/plan/rezumat");
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
  await page.goto("/plan/soi");
  await page.getByRole("link", { name: "Înapoi" }).click();
  await expect(page).toHaveURL("/plan/cultura");
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
