import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const maintenance = process.argv.includes("--maintenance");
const port = process.env.SMOKE_PORT || "3001";
const origin = `http://127.0.0.1:${port}`;
const request = (path) => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(10000), redirect: "manual" });
const existing = await request("/").catch(() => null);
if (existing) throw new Error(`Port ${port} is occupied; choose another SMOKE_PORT.`);

const child = spawn(process.execPath, [fileURLToPath(new URL("node_modules/next/dist/bin/next", root)), "start", "--port", port, "--hostname", "127.0.0.1"], {
  cwd: fileURLToPath(root),
  windowsHide: true,
  stdio: "ignore",
  env: { ...process.env, SITE_URL: origin, NODE_ENV: "production", FE_DIAGNOSTICS: "true", MAINTENANCE_MODE: maintenance ? "true" : "false" },
});
let launchError;
child.on("error", (error) => { launchError = error; });
try {
  let home;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (launchError) throw launchError;
    if (child.exitCode !== null) throw new Error("Production server exited before readiness.");
    home = await request("/").catch(() => undefined);
    if (home) break;
    await setTimeout(250);
  }
  assert.equal(home?.status, maintenance ? 503 : 200, "Production homepage must respond with the configured status");
  const html = await home.text();
  assert.match(html, /lang="vi"/);
  assert.match(html, /noindex/);
  if (maintenance) {
    assert.equal(home.headers.get("retry-after"), "300");
    const logo = await request("/images/stitch/glowup-logo.webp");
    assert.equal(logo.status, 200); assert.match(logo.headers.get("content-type"), /image\/webp/);
    assert.equal((await request("/login")).status, 503);
    const mutation = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(2000) });
    assert.equal(mutation.status, 503); assert.equal((await mutation.json()).code, "MAINTENANCE");
    console.log("Maintenance smoke passed: site/login/BFF return 503 and Retry-After.");
  } else {
    const diagnostic = await request("/dev/backend");
    assert.equal(diagnostic.status, 404, "Diagnostic must stay private even with FE_DIAGNOSTICS=true");
    assert.doesNotMatch(await diagnostic.text(), /data-connected|SSR → backend|NETWORK_ERROR/);
    assert.equal((await request("/missing-fe00-route")).status, 404);
    for (const route of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/oauth/continue"]) {
      const auth = await request(route);
      assert.equal(auth.status, 200, `${route} must render independently`);
      assert.doesNotMatch(await auth.text(), /<(?:header|footer)[\s>]/i, `${route} must not SSR site header/footer`);
    }
    const privatePage = await request("/account/addresses");
    assert.equal(privatePage.status, 307); assert.match(privatePage.headers.get("location"), /login\?returnTo=%2Faccount%2Faddresses/);
    const maintenancePage = await request("/maintenance"); assert.equal(maintenancePage.status, 503); assert.equal(maintenancePage.headers.get("retry-after"), "300");
    console.log("Production smoke passed: home/login 200, private redirect, Vietnamese/noindex, diagnostics/unknown 404, maintenance 503.");
  }
} finally {
  if (child.exitCode === null && !launchError) {
    const stopped = once(child, "exit");
    child.kill();
    await stopped;
  }
}
