import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { isolatedEnv } = require("../../backend/test/readiness-env.cjs");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "../.tmp/development-readiness");
mkdirSync(output, { recursive: true });
const keys = new Set();
for (const name of [".env.example", ".env.local"]) {
  const file = resolve(root, name);
  if (existsSync(file)) {
    for (const match of readFileSync(file, "utf8").matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) keys.add(match[1]);
  }
}
const env = {
  ...isolatedEnv(process.env, keys),
  NODE_ENV: "production", NEXT_DIST_DIR: ".next-readiness",
  SITE_URL: "https://127.0.0.1:3301", BACKEND_API_BASE_URL: "http://127.0.0.1:3300/api/v1",
  SESSION_REDIS_URL: "rediss://127.0.0.1:56380", SESSION_KEY_PREFIX: `glowup:readiness:${process.pid}:`,
  SESSION_MAX_AGE_SECONDS: "3600", OAUTH_GOOGLE_ENABLED: "false", OAUTH_FACEBOOK_ENABLED: "false",
  FE_DIAGNOSTICS: "false", CI: "true",
  BACKEND_TIMEOUT_MS: "5000", SEO_INDEXING_ENABLED: "false",
};
if (process.env.PLAYWRIGHT_BROWSERS_PATH) env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH;
const args = process.argv.slice(2);
const skipBuild = args[0] === "--skip-build";
const stages = [];
const run = (label, command) => {
  const result = spawnSync(process.execPath, command, { cwd: root, env, stdio: "inherit", windowsHide: true });
  stages.push({ label, exitCode: result.status ?? 1 });
  if (result.status !== 0) finish(result.status ?? 1);
};
function finish(exitCode) {
  writeFileSync(resolve(output, "fullstack-execution.json"), JSON.stringify({
    completedAt: new Date().toISOString(), node: process.version, skipBuild, args,
    environment: "Next production build; isolated local Nest/PostgreSQL/Redis; external providers disabled", stages, exitCode,
  }, null, 2) + "\n");
  process.exit(exitCode);
}
const openssl = process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl";
const cert = resolve(output, "readiness-cert.pem");
const key = resolve(output, "readiness-key.pem");
const generated = spawnSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "7", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"], { stdio: "ignore", windowsHide: true });
if (generated.status !== 0) {
  console.error("Readiness HTTPS requires OpenSSL (Git for Windows supplies it at the configured path).");
  finish(1);
}
env.NODE_EXTRA_CA_CERTS = cert;
env.READINESS_TLS_CERT = cert;
env.READINESS_TLS_KEY = key;
if (!skipBuild) run("Next.js production build", ["node_modules/next/dist/bin/next", "build"]);
run("Browser full-stack checkout", ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.readiness.config.ts", ...(skipBuild ? args.slice(1) : args)]);
if ((skipBuild ? args.slice(1) : args).length === 0) {
  run("Post-browser database invariants", [resolve(root, "../backend/test/verify-readiness-orders.cjs")]);
}
finish(0);
