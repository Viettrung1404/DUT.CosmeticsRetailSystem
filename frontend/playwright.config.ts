import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 90_000,
  expect: { timeout: 20_000 },
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
      env: { BACKEND_API_BASE_URL: "http://127.0.0.1:3100/api/v1", FE_DIAGNOSTICS: "true", SESSION_REDIS_URL: process.env.TEST_SESSION_REDIS_URL || process.env.SESSION_REDIS_URL || "redis://127.0.0.1:6379", SESSION_KEY_PREFIX: `glowup:e2e:${process.pid}:`, SESSION_MAX_AGE_SECONDS: "3600" },
    },
  ],
});
