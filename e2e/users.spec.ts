import { expect, test, type Page } from "@playwright/test";

import { createUserAndSignIn } from "./auth-support";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("app-locale", "en"),
  );
});

async function signInAsAdmin(page: Page) {
  const email = `e2e+admincrud+${Date.now()}+${Math.random()
    .toString(36)
    .slice(2, 8)}@example.com`;
  await createUserAndSignIn(page, email, "admin", "Admin CRUD");
}

// An admin can add a user (with an initial password), edit their name,
// and deactivate them. Exercises the better-auth admin API end-to-end.
test("admin creates, edits, and deactivates a user", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/users");

  const email = `e2e+created+${Date.now()}@example.com`;
  const rowByEmail = () => page.getByRole("row").filter({ hasText: email });

  // Create.
  await page.getByRole("button", { name: "Add user" }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Name").fill("Created User");
  await create.getByLabel("Email").fill(email);
  await create.getByLabel("Initial password").fill("password123");
  await create.getByRole("button", { name: "Create user" }).click();

  await expect(rowByEmail()).toBeVisible();
  await expect(rowByEmail().getByText("Active")).toBeVisible();

  // Edit name.
  await rowByEmail().getByRole("button", { name: "Actions" }).click();
  await page.getByRole("menuitem", { name: "Edit name" }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Name").fill("Renamed User");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(rowByEmail().getByText("Renamed User")).toBeVisible();

  // Deactivate.
  await rowByEmail().getByRole("button", { name: "Actions" }).click();
  await page.getByRole("menuitem", { name: "Deactivate" }).click();
  await expect(rowByEmail().getByText("Inactive")).toBeVisible();
});
