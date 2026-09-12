import { expect, test, type Page } from "@playwright/test";

import { createUserAndSignIn } from "./auth-support";

// Pin the English locale so selectors are stable regardless of the default.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("app-locale", "en");
  });
});

async function signIn(page: Page, tag: string, role: string) {
  const email = `e2e+${tag}+${Date.now()}+${Math.floor(Math.random() * 1e6)}@example.com`;
  await createUserAndSignIn(page, email, role, `${tag} user`);
  return email;
}

/** A tRPC mutation is a POST to /api/trpc; wait for its response to settle. */
function trpcMutation(page: Page) {
  return page.waitForResponse(
    (r) => r.url().includes("/api/trpc") && r.request().method() === "POST",
  );
}

// The settings screen edits the SystemConfig singleton through the guarded
// tRPC `config.updateSystem` procedure; the change survives a reload and is
// recorded (with before/after values) in the audit log.
test("admin edits the site name; it persists and is audited", async ({
  page,
}) => {
  await signIn(page, "settings", "admin");

  await page.goto("/settings");
  const siteName = page.getByLabel("Site name");
  await expect(siteName).toBeVisible();

  const value = `E2E Site ${Date.now()}`;
  await siteName.fill(value);
  await Promise.all([
    trpcMutation(page),
    page.getByRole("button", { name: "Save settings" }).click(),
  ]);

  await page.reload();
  await expect(page.getByLabel("Site name")).toHaveValue(value);

  await page.goto("/audit");
  const row = page.getByRole("row").filter({ hasText: value });
  await expect(row).toBeVisible();
  await expect(row).toContainText("system.update_config");
});

// An auditor can open settings (system-config:read) but the form is read-only:
// no save button and disabled inputs.
test("auditor sees settings read-only", async ({ page }) => {
  await signIn(page, "auditor", "auditor");

  await page.goto("/settings");
  await expect(page.getByLabel("Site name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save settings" })).toHaveCount(
    0,
  );
});
