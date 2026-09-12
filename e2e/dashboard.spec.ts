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
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const email = `e2e+post+${Date.now()}@example.com`;
    await createUserAndSignIn(page, email, "member", "Post Author");

    await expect(
      page.getByRole("heading", { name: "Welcome, Post Author" }),
    ).toBeVisible();

    const title = `Hello from e2e ${Date.now()}`;
    await page.getByPlaceholder("Write a new post…").fill(title);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(title)).toBeVisible();

    // Reload with a post already present: this is the path that regressed
    // to a hydration mismatch (`prefetch` not awaited — see issue 0012) —
    // the server rendered `PostList`'s "Loading…" branch while the client
    // rendered the resolved list.
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();

    expect(pageErrors.filter((m) => /Hydration/i.test(m))).toEqual([]);
  });
});

// The sign-in helper relies on English labels, so EN is pinned before sign-in;
// the switch to Romanian afterwards must survive a reload on its own. The pin
// is conditional: init scripts also run in same-origin frames created later
// (the Next dev overlay), and an unconditional write would fire a `storage`
// event that resets the locale mid-test.
test("language toggle persists across reloads", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("app-locale")) {
      window.localStorage.setItem("app-locale", "en");
    }
  });
  const email = `e2e+lang+${Date.now()}@example.com`;
  await createUserAndSignIn(page, email, "member", "Lang User");

  // The server renders the Romanian default; "en" pressed proves hydration has
  // applied the pinned locale, so the click below reaches a live handler.
  await expect(
    page.getByRole("button", { name: "en", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "ro", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ro", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", { name: "Panou principal" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("link", { name: "Panou principal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ro", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
