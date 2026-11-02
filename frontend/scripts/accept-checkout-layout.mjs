import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "../..");
const origin = process.env.FE_ACCEPT_ORIGIN || "https://localhost:3001";
const output = resolve(process.env.FE_REVIEW_OUTPUT || "../.tmp/checkout-review");
const credentials = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/credentials.json"), "utf8"),
);
const email = process.env.FE_ACCEPT_EMAIL || "customer-20@demo.glowup.test";
const results = [];
const check = (name, passed) => {
  results.push({ name, passed: !!passed });
  if (!passed) throw new Error(`Check failed: ${name}`);
};
const browser = await chromium.launch();
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1100 },
  permissions: ["geolocation"],
  geolocation: { latitude: 10.775, longitude: 106.703 },
});
let createdAddress;
try {
  const ready = await context.request.get("http://localhost:3000/api/v1/health/ready");
  check("Backend readiness", ready.status() === 200);
  const login = await context.request.post(`${origin}/api/auth/login`, {
    headers: { Origin: origin },
    data: { email, password: credentials[email].password },
  });
  check("Real BFF login", login.status() === 200);
  const benefitsResponse = await context.request.get(`${origin}/api/checkout/benefits`);
  const benefits = await benefitsResponse.json();
  check(
    "Real voucher wallet and point policy",
    benefitsResponse.ok() && benefits.points.step > 0 && Array.isArray(benefits.coupons),
  );
  const original = await (await context.request.get(`${origin}/api/account/addresses`)).json();
  check("Existing demo address available", original.length > 0 && original.length < 10);
  // Stub tiles in automation, never harvest third-party map tiles with a headless browser.
  await context.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/checkout`);
  await page.locator(".checkout-grand-total").waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: "Thêm địa chỉ mới", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Họ và tên người nhận/).fill("Checkout QA");
  await dialog.getByLabel(/Số điện thoại/).fill("0901234567");
  await dialog.locator("#saved-address-city").selectOption("79");
  await dialog.locator("#saved-address-ward").selectOption({ label: "Phường Sài Gòn" });
  await dialog.getByLabel(/Số nhà, tên đường/).fill("12 Nguyễn Huệ");
  await dialog.getByRole("button", { name: "Chọn vị trí trên bản đồ" }).click();
  await dialog.getByRole("button", { name: "Vị trí của tôi" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".delivery-map-caption")?.textContent?.includes("10.775000"),
  );
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/account/addresses") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Lưu và sử dụng địa chỉ" }).click();
  const response = await savedResponse;
  const saved = await response.json();
  if (response.ok()) createdAddress = saved.id;
  check(
    "Save modern address and map point through real API",
    response.ok() &&
      saved.district === "" &&
      saved.latitude === 10.775 &&
      saved.longitude === 106.703,
  );
  await dialog.waitFor({ state: "hidden" });
  check(
    "New address selected in checkout",
    (await page.locator(".checkout-address-card.is-selected").innerText()).includes("Checkout QA"),
  );
  check(
    "Shipping policy comes from the server quote",
    (await page.locator(".checkout-shipping-note").innerText()).includes("500.000"),
  );
  const reloaded = await (await context.request.get(`${origin}/api/account/addresses`)).json();
  check(
    "Map point persisted in database",
    reloaded.some(
      (address) =>
        address.id === saved.id && address.latitude === 10.775 && address.longitude === 106.703,
    ),
  );
  await page.getByRole("button", { name: "Chọn mã ưu đãi" }).click();
  const usableCoupon = page
    .locator(".checkout-voucher-card")
    .filter({ has: page.getByRole("button", { name: "Dùng mã", exact: true, disabled: false }) })
    .first();
  if (await usableCoupon.count()) {
    const couponCode = await usableCoupon.locator("code").innerText();
    await usableCoupon.getByRole("button", { name: "Dùng mã", exact: true }).click();
    await page.waitForFunction(
      (code) =>
        document.querySelector(".checkout-applied-coupon")?.textContent?.includes(code) &&
        !document.querySelector(".checkout-quote-updating") &&
        !!document.querySelector(".checkout-grand-total"),
      couponCode,
    );
    check(
      "Real coupon verified and applied",
      (await page.locator(".checkout-price-breakdown").innerText()).includes(couponCode),
    );
  }
  await mkdir(output, { recursive: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important }" });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(output, "checkout-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(output, "checkout-mobile.png"), fullPage: true });
  check(
    "Mobile has no horizontal overflow",
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  check("No client errors", errors.length === 0);
  await page.goto(`${origin}/account/addresses`);
  const savedCard = page.locator(".address-card").filter({ hasText: "Checkout QA" });
  await savedCard.getByRole("button", { name: "Chỉnh sửa" }).click();
  const editor = page.locator(".address-editor");
  await editor.getByLabel(/Số nhà, tên đường/).fill("14 Nguyễn Huệ");
  await editor.getByRole("button", { name: "Lưu địa chỉ", exact: true }).click();
  await editor.waitFor({ state: "hidden" });
  const edited = await (await context.request.get(`${origin}/api/account/addresses`)).json();
  check(
    "Address book uses the same two-level editor and preserves coordinates",
    edited.some(
      (address) =>
        address.id === createdAddress &&
        address.addressLine === "14 Nguyễn Huệ" &&
        address.latitude === 10.775,
    ),
  );
} finally {
  if (createdAddress) {
    const removed = await context.request.delete(
      `${origin}/api/account/addresses/${createdAddress}`,
      { headers: { Origin: origin }, data: {} },
    );
    results.push({ name: "Temporary QA address removed", passed: removed.ok() });
  }
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "checks.json"), JSON.stringify(results, null, 2));
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}
