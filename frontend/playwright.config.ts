import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const port = process.env.PLAYWRIGHT_PORT || "3001";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    { command: "node tests/fixtures/health-server.mjs", url: "http://127.0.0.1:3100/api/v1/health/live", reuseExistingServer: false },
    {
      command: `node node_modules/next/dist/bin/next dev --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_DIST_DIR: ".next-e2e", SITE_URL: baseURL, BACKEND_API_BASE_URL: "http://127.0.0.1:3100/api/v1", FE_DIAGNOSTICS: "true", SESSION_REDIS_URL: process.env.TEST_SESSION_REDIS_URL || process.env.SESSION_REDIS_URL || "redis://127.0.0.1:6379", SESSION_KEY_PREFIX: `glowup:e2e:${process.pid}:`, SESSION_MAX_AGE_SECONDS: "3600", GOOGLE_OAUTH_CLIENT_ID: "123-fixture.apps.googleusercontent.com", FACEBOOK_APP_ID: "123456", FACEBOOK_GRAPH_VERSION: "v25.0", OAUTH_GOOGLE_ENABLED: "true", OAUTH_FACEBOOK_ENABLED: "true" },
    },
  ],
});
