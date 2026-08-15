import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 15_000,
  globalTimeout: 180_000,
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    navigationTimeout: 10_000,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm serve:dist",
    url: "http://127.0.0.1:4173",
    timeout: 60_000,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
