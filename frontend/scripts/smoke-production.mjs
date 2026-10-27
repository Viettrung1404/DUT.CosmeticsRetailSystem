import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const origin = "http://127.0.0.1:3001";
const request = (path) => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(2000), redirect: "manual" });
const existing = await request("/").catch(() => null);
if (existing) throw new Error("Port 3001 is occupied; stop the existing app before production smoke.");

const child = spawn(process.execPath, [fileURLToPath(new URL("node_modules/next/dist/bin/next", root)), "start", "--port", "3001", "--hostname", "127.0.0.1"], {
  cwd: fileURLToPath(root),
  windowsHide: true,
  stdio: "ignore",
  env: { ...process.env, NODE_ENV: "production", FE_DIAGNOSTICS: "true" },
});
let launchError;
child.on("error", (error) => { launchError = error; });
try {
  let home;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (child.exitCode !== null) throw new Error("Production server exited before readiness.");
    home = await request("/").catch(() => undefined);
    if (home) break;
    await setTimeout(250);
  }
  assert.equal(home?.status, 200, "Production homepage must respond");
  const html = await home.text();
  assert.match(html, /lang="vi"/);
  assert.match(html, /noindex/);
  const diagnostic = await request("/dev/backend");
  assert.equal(diagnostic.status, 404, "Diagnostic must stay private even with FE_DIAGNOSTICS=true");
  assert.doesNotMatch(await diagnostic.text(), /data-connected|SSR → backend|NETWORK_ERROR/);
  assert.equal((await request("/missing-fe00-route")).status, 404);
  console.log("Production smoke passed: home 200, Vietnamese/noindex, diagnostics 404, unknown route 404.");
} finally {
  if (child.exitCode === null && !launchError) {
    const stopped = once(child, "exit");
    child.kill();
    await stopped;
  }
}
