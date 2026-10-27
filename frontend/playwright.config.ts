import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    { command: "node tests/fixtures/health-server.mjs", url: "http://127.0.0.1:3100/api/v1/health/live", reuseExistingServer: false },
    {
      command: "npm run dev",
      url: "http://localhost:3001",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { BACKEND_API_BASE_URL: "http://127.0.0.1:3100/api/v1", FE_DIAGNOSTICS: "true" },
    },
  ],
});
