import { expect, test } from "@playwright/test";

import { createUserAndSignIn } from "./auth-support";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem("app-locale", "en"),
    );
  });

  // The demo vertical slice: a signed-in member adds a post from the dashboard
  // (auth → protected tRPC mutation → Prisma → UI) and it appears in the list.
  test("member adds a post from the dashboard", async ({ page }) => {
    const email = `e2e+post+${Date.now()}@example.com`;
    await createUserAndSignIn(page, email, "member", "Post Author");

    await expect(
      page.getByRole("heading", { name: "Welcome, Post Author" }),
    ).toBeVisible();

    const title = `Hello from e2e ${Date.now()}`;
    await page.getByPlaceholder("Write a new post…").fill(title);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(title)).toBeVisible();

    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
  });
});

// No locale pin here: English is the default, and the persisted choice must
// survive a reload on its own.
test("language toggle persists across reloads", async ({ page }) => {
  const email = `e2e+lang+${Date.now()}@example.com`;
  await createUserAndSignIn(page, email, "member", "Lang User");

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "ro" }).click();
  await expect(
    page.getByRole("link", { name: "Panou principal" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("link", { name: "Panou principal" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "ro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
