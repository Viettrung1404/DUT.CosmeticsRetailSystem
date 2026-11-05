import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "../.tmp/development-readiness");
mkdirSync(output, { recursive: true });
const require = createRequire(import.meta.url);
const { isolatedEnv } = require("../../backend/test/readiness-env.cjs");
const keys = new Set();
for (const name of [".env.example", ".env.local"]) {
  const file = resolve(root, name);
  if (existsSync(file)) {
    for (const match of readFileSync(file, "utf8").matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) keys.add(match[1]);
  }
}
const env = {
  ...isolatedEnv(process.env, keys), NODE_ENV: "development",
  BACKEND_TIMEOUT_MS: "5000", SEO_INDEXING_ENABLED: "false", PLAYWRIGHT_PORT: "3401",
  TEST_SESSION_REDIS_URL: "redis://127.0.0.1:56379", CI: "true",
  PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(output, "ui-fixture-results.json"),
};
if (process.env.PLAYWRIGHT_BROWSERS_PATH) env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH;
const args = ["node_modules/@playwright/test/cli.js", "test", "--reporter=json", "--max-failures=3", ...process.argv.slice(2)];
const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
writeFileSync(resolve(output, "ui-fixture-execution.json"), JSON.stringify({
  completedAt: new Date().toISOString(), node: process.version, args,
  environment: "Isolated development frontend; HTTP contract fixture at 3100 and dedicated Redis at 56379; not real backend/provider acceptance",
  exitCode: result.status ?? 1,
}, null, 2) + "\n");
process.exitCode = result.status ?? 1;
