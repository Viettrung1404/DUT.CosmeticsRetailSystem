import { defineConfig, devices } from "@playwright/test";

const baseURL = "https://127.0.0.1:3301";
const env = {
  NEXT_DIST_DIR: ".next-readiness",
  SITE_URL: baseURL,
  BACKEND_API_BASE_URL: "http://127.0.0.1:3300/api/v1",
  SESSION_REDIS_URL: "rediss://127.0.0.1:56380",
  SESSION_KEY_PREFIX: `glowup:readiness:${process.pid}:`,
  SESSION_MAX_AGE_SECONDS: "3600",
  OAUTH_GOOGLE_ENABLED: "false",
  OAUTH_FACEBOOK_ENABLED: "false",
  FE_DIAGNOSTICS: "false",
  BACKEND_TIMEOUT_MS: "5000",
  SEO_INDEXING_ENABLED: "false",
};

export default defineConfig({
  testDir: "./tests/readiness",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "../.tmp/development-readiness/fullstack-results.json" }],
  ],
  outputDir: "../.tmp/development-readiness/browser-artifacts",
  use: { baseURL, ignoreHTTPSErrors: true, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    {
      command: "node test/start-readiness-server.cjs",
      cwd: "../backend",
      url: "http://127.0.0.1:3300/api/v1/health/ready",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node scripts/start-readiness-frontend.mjs",
      url: baseURL,
      reuseExistingServer: false,
      ignoreHTTPSErrors: true,
      timeout: 90_000,
      env,
    },
  ],
});
