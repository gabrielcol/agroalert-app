import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const emptyModule = fileURLToPath(
  new URL("./test/empty-module.ts", import.meta.url),
);

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // No RSC boundary in tests — neutralize the guard modules.
      "server-only": emptyModule,
      "client-only": emptyModule,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Env for modules loaded at import time (env validation, db, auth).
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./dev.db",
      BETTER_AUTH_SECRET: "test-secret-do-not-use-in-prod-0123456789",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
    // Playwright specs live in e2e/ and run via `bun run test:e2e`.
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
  },
});
