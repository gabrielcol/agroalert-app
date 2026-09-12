import { expect, test } from "@playwright/test";

import { createUserAndSignIn } from "./auth-support";

// Pin the English locale so form-label selectors are stable.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("app-locale", "en"),
  );
});

// Public self-service sign-up is disabled. The /sign-up route
// still resolves but shows a notice instead of a registration form — there is
// no Name field and no "Sign up" submit button.
test("public sign-up is disabled", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByText("Sign-up unavailable")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign up" })).toHaveCount(0);
  // The notice links back to sign-in.
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

// An admin-provisioned account signs in and reaches the (auth-guarded) admin
// dashboard; clearing the session cookie makes the layout guard redirect back
// to sign-in.
test("sign in reaches the dashboard; guard redirects when signed out", async ({
  page,
  context,
}) => {
  const email = `e2e+auth+${Date.now()}@example.com`;
  await createUserAndSignIn(page, email, "admin", "E2E User");

  await expect(page).toHaveURL("/dashboard");

  // Simulate sign-out and confirm the protected area is no longer reachable.
  await context.clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/sign-in");
});
