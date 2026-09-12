import { execFileSync } from "node:child_process";

import { expect, type Page } from "@playwright/test";

/**
 * Shared auth helper. Public self-service sign-up is disabled, so e2e
 * accounts are provisioned out-of-band with the `create-user` ops script (the
 * same path an admin uses via the users UI) and then signed in through the UI.
 *
 * `role` defaults to the non-functional `pending` sentinel to mirror the old
 * sign-up-then-promote flow — callers that need a functional role either pass it
 * here or promote afterward with `set-role`. English is assumed (specs force the
 * `en` locale in a `beforeEach`) so the form-label selectors stay stable.
 */
const E2E_PASSWORD = "password123";

export async function createUserAndSignIn(
  page: Page,
  email: string,
  role = "pending",
  name = "E2E User",
): Promise<void> {
  // Argument-based invocation (no shell interpolation); throws on failure.
  execFileSync("bun", ["run", "create-user", email, E2E_PASSWORD, role, name]);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Generous timeout: under `next dev` the first navigation to /dashboard
  // compiles the route on demand, which can exceed the default 5s expect
  // timeout when several specs run in parallel.
  await expect(page).toHaveURL("/dashboard", { timeout: 20_000 });
}
