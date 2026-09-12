import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("Alerte active · SMS")).toBeVisible();
  // Auth is hidden: nothing on the public screen points at sign-in.
  await expect(
    page.getByRole("link", { name: /sign in|autentific/i }),
  ).toHaveCount(0);
});

test("the add-crop wizard walks all four steps and activates alerts", async ({
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

  // Loading screen plays (~3.3 s), then lands on step 2. Generous timeout:
  // under `next dev` the first navigation compiles the route on demand.
  await expect(page.getByText("Pregătim recomandarea")).toBeVisible();
  await expect(page).toHaveURL("/plan/cultura", { timeout: 20_000 });
  await expect(page.getByText("Pasul 2 din 4")).toBeVisible();

  // Step 2 — crops. Wheat is recommended and pre-selected; pick barley.
  const wheat = page.getByRole("button", { name: /Grâu de toamnă/ });
  const barley = page.getByRole("button", { name: /^Orz/ });
  await expect(wheat).toHaveAttribute("aria-pressed", "true");
  await barley.click();
  await expect(barley).toHaveAttribute("aria-pressed", "true");
  await expect(wheat).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "Continuă" }).click();

  // Step 3 — varieties.
  await expect(page).toHaveURL("/plan/soi");
  await expect(page.getByText("Pasul 3 din 4")).toBeVisible();
  await expect(page.getByRole("button", { name: /Glosa/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("link", { name: "Vezi planul" }).click();

  // Step 4 — the plan: one alerts card with all three rows.
  await expect(page).toHaveURL("/plan/rezumat");
  await expect(page.getByText("Pasul 4 din 4")).toBeVisible();
  await expect(page.getByText("25 sept – 15 oct")).toBeVisible();
  await expect(page.getByText("Alerte pentru zona ta")).toHaveCount(1);
  await expect(
    page.getByText("Momentan: niciun cod de avertizare ANM în zonă"),
  ).toBeVisible();

  // Channel choice feeds the confirmation copy.
  await page.getByRole("radio", { name: "Apel telefonic" }).click();
  await page.getByRole("button", { name: "Activează alertele" }).click();
  await expect(
    page.getByRole("heading", { name: "Alertele sunt active" }),
  ).toBeVisible();
  await expect(page.getByText(/prin apel telefonic/)).toBeVisible();

  await page.getByRole("link", { name: "Înapoi la culturile tale" }).click();
  await expect(page).toHaveURL("/");
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
