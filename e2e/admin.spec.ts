import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

import { createUserAndSignIn } from "./auth-support";

// Pin the English locale so form-label selectors are stable.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("app-locale", "en"),
  );
});

// Provision a `pending` account and sign in (public sign-up is disabled).
// Tests promote via `setRole` afterward, mirroring the real flow.
async function signUp(page: Page, email: string) {
  await createUserAndSignIn(page, email);
}

// Promote a user via the ops script (argument-based — no shell interpolation);
// failures throw instead of surfacing later as a flaky timeout.
function setRole(email: string, role: string) {
  execFileSync("bun", ["run", "set-role", email, role]);
}

// A freshly signed-up user gets the least-privilege `pending` role and must not
// reach either admin page — enforced server-side (RBAC redirect).
test("non-admin cannot access the user or audit admin pages", async ({
  page,
}) => {
  await signUp(page, `e2e+pending+${Date.now()}@example.com`);

  await page.goto("/users");
  await expect(page).toHaveURL("/dashboard");

  await page.goto("/audit");
  await expect(page).toHaveURL("/dashboard");
});

// A promoted admin can manage users and read the audit log.
test("promoted admin manages users and sees the audit log", async ({
  page,
}) => {
  const email = `e2e+admin+${Date.now()}@example.com`;
  await signUp(page, email);
  setRole(email, "admin");

  await page.goto("/users");
  await expect(
    page.getByRole("heading", { name: "Users & roles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: email, exact: true }),
  ).toBeVisible();

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText("auth.sign_in").first()).toBeVisible();
});

// An Auditor may read the audit log but not manage users.
test("auditor sees the audit log but not user management", async ({ page }) => {
  const email = `e2e+auditor+${Date.now()}@example.com`;
  await signUp(page, email);
  setRole(email, "auditor");

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

  await page.goto("/users");
  await expect(page).toHaveURL("/dashboard");
});
