import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "../..");
const origin = process.env.FE_ACCEPT_ORIGIN ?? "http://localhost:3001";
const backend = process.env.FE_ACCEPT_BACKEND ?? "http://localhost:3000/api/v1";
const email = process.env.FE_ACCEPT_EMAIL ?? "customer-01@demo.glowup.test";
const credentials = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/credentials.json"), "utf8"),
);
if (!credentials[email]) throw new Error(`Demo account unavailable: ${email}`);

const results = [];
let cookie = "";
async function request(label, path, { method = "GET", body, auth = true } = {}) {
  try {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: {
        ...(auth && cookie ? { cookie } : {}),
        ...(body ? { "content-type": "application/json", origin } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45000),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("json") ? await response.json() : null;
    const result = {
      label,
      status: response.status,
      ...(payload?.code ? { code: payload.code } : {}),
      ...(payload?.message && !response.ok ? { message: payload.message } : {}),
    };
    results.push(result);
    console.log(JSON.stringify(result));
    return payload;
  } catch (error) {
    const result = { label, error: error.message };
    results.push(result);
    console.log(JSON.stringify(result));
    return null;
  }
}

const health = await fetch(`${backend}/health/ready`, { signal: AbortSignal.timeout(5000) });
console.log(JSON.stringify({ label: "backend ready", status: health.status }));
await request("login", "/api/auth/login", {
  method: "POST",
  auth: false,
  body: { email, password: credentials[email].password },
});
if (!cookie) throw new Error("Login did not set a session cookie");

if (!process.argv.includes("--ui-only")) {
  await request("FE03 cart", "/api/cart/items");
  const catalog = JSON.parse(
    await readFile(resolve(root, "backend/.demo-data/catalog-before-enrichment.json"), "utf8"),
  );
  const variantId = catalog.products.find((product) => product.variants?.length)?.variants[0]?.id;
  if (variantId) {
    await request("FE03 checkout preview", "/api/checkout/preview", {
      method: "POST",
      body: { items: [{ variantId, quantity: 1 }] },
    });
  }
  await request("FE04 profile", "/api/account/profile");
  const orders = await request("FE04 orders", "/api/account/orders?page=1");
  const orderId = orders?.orders?.[0]?.id;
  if (orderId) {
    await request("FE04 order detail", `/api/account/orders/${orderId}`);
    await request("FE04 tracking", `/api/account/orders/${orderId}/tracking`);
    await request("FE03 order success data", `/api/checkout/order/${orderId}`);
  }
  await request("FE05 wishlist", "/api/account/commerce/wishlist");
  await request("FE05 loyalty", "/api/account/commerce/loyalty");
  await request("FE05 rewards", "/api/account/commerce/rewards");
  const returns = await request("FE05 returns", "/api/account/commerce/returns");
  if (returns?.items?.[0]?.id)
    await request("FE05 return detail", `/api/account/commerce/returns/${returns.items[0].id}`);
  await request("FE05 notifications", "/api/account/commerce/notifications");
}

if (process.argv.includes("--ui-only") || process.argv.includes("--with-ui")) {
  const uiOrders = await request("FE04 orders for UI", "/api/account/orders?page=1");
  const uiReturns = await request("FE05 returns for UI", "/api/account/commerce/returns");
  const uiOrderId = uiOrders?.orders?.[0]?.id;
  const uiReturnId = uiReturns?.items?.[0]?.id;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const separator = cookie.indexOf("=");
    await context.addCookies([
      {
        name: cookie.slice(0, separator),
        value: cookie.slice(separator + 1),
        domain: new URL(origin).hostname,
        httpOnly: true,
        secure: cookie.startsWith("__Host-"),
        path: "/",
      },
    ]);
    for (const [label, path] of [
      ["FE04 orders page", "/account/orders"],
      ["FE04 profile page", "/account/profile"],
      ["FE04 security page", "/account/security"],
      ...(uiOrderId
        ? [
            ["FE04 order detail page", `/account/orders/${uiOrderId}`],
            ["FE04 tracking page", `/account/orders/${uiOrderId}/tracking`],
            ["FE03 order result page", `/order-success/${uiOrderId}`],
          ]
        : []),
      ["FE05 loyalty page", "/account/loyalty"],
      ["FE05 rewards page", "/account/loyalty/rewards"],
      ["FE05 returns page", "/account/returns"],
      ["FE05 new return page", "/account/returns/new"],
      ...(uiReturnId ? [["FE05 return detail page", `/account/returns/${uiReturnId}`]] : []),
      ["FE05 wishlist page", "/account/wishlist"],
      ["FE05 notifications page", "/account/notifications"],
      ["FE03 cart page", "/cart"],
      ["FE03 checkout page", "/checkout"],
    ]) {
      const page = await context.newPage();
      let routeFailed = false;
      try {
        const response = await page.goto(`${origin}${path}`, {
          waitUntil: "commit",
          timeout: 45000,
        });
        const heading = await page.locator("h1").first().textContent({ timeout: 15000 });
        const result = { label, status: response?.status(), heading: heading?.trim() };
        results.push(result);
        console.log(JSON.stringify(result));
      } catch (error) {
        const result = {
          label,
          url: page.url(),
          error: error.message.slice(0, 200),
          body: (
            await page
              .locator("body")
              .innerText()
              .catch(() => "")
          ).slice(0, 120),
        };
        results.push(result);
        console.log(JSON.stringify(result));
        routeFailed = true;
      }
      await page.close();
      if (routeFailed) break;
    }
  } finally {
    await browser.close();
  }
}

console.log(
  JSON.stringify({ total: results.length, failed: results.filter((item) => item.status !== 200) }),
);
process.exitCode = results.some((item) => item.status !== 200) ? 1 : 0;
