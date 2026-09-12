import { defineConfig, devices } from "@playwright/test";

// Port is configurable via env so the suite can run on a dedicated port when a
// dev server is already bound to 3000 (e.g. parallel worktrees). Defaults to
// 3000 — unchanged for the common case. Setting E2E_PORT also disables reuse so
// the run always boots its own server with the code under test.
const dedicatedPort = process.env.E2E_PORT;
const PORT = Number(dedicatedPort ?? process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Boots the app for the test run (reuses a dev server if one is already up,
  // unless a dedicated E2E_PORT was requested). When a dedicated port is used
  // the auth base URLs are realigned to it so better-auth accepts the origin.
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI && !dedicatedPort,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_BETTER_AUTH_URL: baseURL,
    },
  },
});
