import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

// Counts real upstream traffic, including SSR and RSC prefetch, without recording credentials.
const [dist = ".next", output = "catalog-measurement.json"] = process.argv.slice(2);
const backend = process.env.MEASURE_BACKEND || "http://127.0.0.1:3000";
assert.equal((await fetch(`${backend}/api/v1/health/ready`)).status, 200);
const counts = new Map();
let phase = "startup";
const proxy = http.createServer((req, res) => {
  const upstream = http.request(new URL(req.url, backend), {
    method: req.method, headers: { ...req.headers, host: new URL(backend).host },
  }, (reply) => {
    const key = `${phase} ${req.method} ${req.url} ${reply.statusCode}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    res.writeHead(reply.statusCode, reply.headers);
    reply.pipe(res);
  });
  upstream.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
// A fresh origin key makes reference caches cold on every measurement run.
const proxyPort = proxy.address().port;
const origin = "http://127.0.0.1:3420";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3420", "--hostname", "127.0.0.1"], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: dist,
    BACKEND_API_BASE_URL: `http://127.0.0.1:${proxyPort}/api/v1`, SITE_URL: origin },
});
let serverLog = "";
child.stdout.on("data", (data) => { serverLog = (serverLog + data).slice(-8000); });
child.stderr.on("data", (data) => { serverLog = (serverLog + data).slice(-8000); });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Next exited: ${serverLog}`);
    if (await fetch(`${origin}/login`).then((r) => r.ok).catch(() => false)) { ready = true; break; }
    await delay(500);
  }
  assert.ok(ready, "Production frontend readiness");
  const brands = await fetch(`${backend}/api/v1/brands?limit=1`).then((r) => r.json());
  const brand = process.env.MEASURE_BRAND || brands.data?.[0]?.slug;
  assert.ok(brand, "Need a real brand for metadata/page dedup measurement");
  const products = await fetch(`${backend}/api/v1/customer/products?limit=1`).then((r) => r.json());
  const slug = products.data?.data?.[0]?.slug;
  assert.ok(slug, "Need a real product");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const navigation = [];
  const brandOnly = process.argv.includes("--brand-only");
  for (let pass = 1; pass <= (brandOnly ? 5 : 2); pass++) {
    for (const path of brandOnly ? [`/brands/${brand}`] : ["/", "/products", "/brands", `/brands/${brand}`, `/products/${slug}`, "/search?q=serum"]) {
      phase = `pass${pass}:${path}`;
      const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);
      navigation.push({ pass, path, status: response.status() });
    }
  }
  const entries = [...counts].map(([request, count]) => ({ request, count }));
  const verification = [];
  if (process.argv.includes("--verify-interactions")) {
    phase = "verify:filter";
    const filterRequest = page.waitForRequest((request) => request.url().includes("/api/catalog/products?") && request.url().includes("price_asc"));
    await page.locator("#catalog-sort-select").selectOption("price_asc");
    await filterRequest;
    await page.waitForTimeout(1500);
    assert.match(page.url(), /sortBy=price_asc/);
    verification.push("filter updates URL and sends a catalog GET");

    phase = "verify:debounce";
    const input = page.getByRole("combobox", { name: "Tìm kiếm sản phẩm", exact: true });
    await input.pressSequentially("serum", { delay: 40 });
    await page.waitForTimeout(2000);
    const hintRequests = [...counts].filter(([key]) => key.startsWith(phase) && key.includes("/customer/products/search-hints?"));
    assert.equal(hintRequests.reduce((n, [, count]) => n + count, 0), 1, "Fast typing must produce one upstream hint request");
    verification.push("typing serum at 40ms/character produces one upstream hints request");
    await input.press("Escape");

    phase = "verify:navigation";
    const card = page.locator(".catalog-card-image").first();
    const target = await card.getAttribute("href");
    await card.click();
    await page.waitForURL(`${origin}${target}`);
    await page.locator(".pdp-main").waitFor();
    verification.push("product link navigation renders PDP");

    phase = "verify:privacy";
    assert.equal((await page.request.get(`${origin}/api/account/profile`)).status(), 401);
    verification.push("anonymous private profile remains 401");
  }
  const verificationEntries = [...counts].filter(([key]) => key.startsWith("verify:")).map(([request, count]) => ({ request, count }));
  const result = { dist, backendReady: true, navigation, total: entries.reduce((n, item) => n + item.count, 0), entries, verification, verificationEntries };
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ dist, output, total: result.total, navigation, verification }, null, 2));
  assert.ok(navigation.every((r) => r.status === 200), "All measured pages must render successfully");
} finally {
  await browser?.close();
  if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
  await new Promise((resolve) => proxy.close(resolve));
}
