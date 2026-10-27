import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
const localEnv = fileURLToPath(new URL("../.env.local", import.meta.url));
if (existsSync(localEnv)) process.loadEnvFile(localEnv);
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url)), "run", "tests/unit/session-redis.test.ts"], {
  stdio: "inherit", windowsHide: true, env: { ...process.env, TEST_SESSION_REDIS_URL: process.env.TEST_SESSION_REDIS_URL || process.env.SESSION_REDIS_URL, RUN_REDIS_TESTS: "true" },
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
child.on("error", () => { process.exitCode = 1; });
