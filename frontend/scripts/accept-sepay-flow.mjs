// Real BFF + configured sandbox API. Creates and cancels only its own test order.
// Successful payment is covered by isolated PostgreSQL tests and the manual SePay simulator demo.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "../..");
const origin = process.env.FE_ACCEPT_ORIGIN || "https://localhost:3001";
const output = resolve(root, ".tmp/sepay-review");
const email = process.env.FE_ACCEPT_EMAIL || "customer-20@demo.glowup.test";
const credentials = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/credentials.json"), "utf8"),
);
const catalog = JSON.parse(
  await readFile(resolve(root, "backend/.demo-data/catalog-before-enrichment.json"), "utf8"),
);
const browser = await chromium.launch();
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1100 },
});
const checks = [];
let orderId;
let cancelled = false;
const check = (name, passed) => {
  checks.push({ name, passed: !!passed });
  if (!passed) throw new Error(name);
  console.log(`PASS: ${name}`);
};
async function request(path, method = "GET", data) {
  const reply = await context.request.fetch(`${origin}${path}`, {
    method,
    headers: { Origin: origin },
    ...(data ? { data } : {}),
  });
  if (!reply.headers()["content-type"]?.includes("application/json"))
    throw new Error(`${method} ${path}: expected JSON, received ${reply.status()}`);
  const value = await reply.json();
  if (!reply.ok()) throw new Error(`${method} ${path}: ${reply.status()} ${JSON.stringify(value)}`);
  return value;
}
try {
  const ready = await context.request.get("http://localhost:3000/api/v1/health/ready");
  check("Backend readiness", ready.status() === 200);
  await request("/api/auth/login", "POST", { email, password: credentials[email].password });
  const cart = await request("/api/cart/items");
  // Select a variant absent from the customer's cart so checkout cannot consume their cart lines.
  const existing = new Set(
    (cart.items || []).map((item) => item.productVariantId || item.variantId || item.variant?.id),
  );
  let items, quote;
  for (const product of catalog.products) {
    const variant = product.variants?.find((item) => !existing.has(item.id));
    if (!variant) continue;
    try {
      items = [{ variantId: variant.id, quantity: 1 }];
      quote = await request("/api/checkout/preview", "POST", { items });
      break;
    } catch {
      /* Try another available variant. */
    }
  }
  check("Isolated order quote", !!quote);
  const order = await request("/api/checkout/order", "POST", {
    items,
    quoteVersion: quote.quoteVersion,
    paymentMethod: "SEPAY",
    idempotencyKey: crypto.randomUUID(),
    shippingAddress: {
      recipientName: "SePay QA",
      phone: "0901234567",
      addressLine: "12 Nguyễn Huệ",
      ward: "Phường Sài Gòn",
      city: "Thành phố Hồ Chí Minh",
      district: "",
    },
  });
  orderId = order.id;
  check("New order waits for payment", order.status === "PENDING_PAYMENT");
  const payment = await request("/api/checkout/payment", "POST", { orderId });
  check("Real sandbox transfer instructions", JSON.parse(payment.qrCodeData).mode === "sandbox");
  const page = await context.newPage();
  await page.goto(`${origin}/payment/return?paymentId=${payment.paymentId}`);
  await page.getByRole("heading", { name: "Thanh toán thử nghiệm SePay", exact: true }).waitFor();
  await page.getByRole("img", { name: "Mã VietQR thử nghiệm SePay" }).waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector(".sepay-qr-frame img");
    return image?.complete && image.naturalWidth > 0;
  });
  check("Provider QR image loaded", true);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: resolve(output, "payment-desktop.png"), fullPage: true });
  await page.goto(`${origin}/account/orders/${orderId}`);
  await page.getByRole("button", { name: "Tiếp tục thanh toán SePay", exact: true }).click();
  await page.waitForURL(`**/payment/return?paymentId=${payment.paymentId}`);
  const resumed = await request("/api/checkout/payment", "POST", { orderId });
  check(
    "Resume preserves payment ID and deadline",
    resumed.paymentId === payment.paymentId && resumed.expiresAt === payment.expiresAt,
  );
  // Give the real background worker time to perform its ordinary empty transaction lookup.
  await page.waitForTimeout(22000);
  const polled = await request(`/api/checkout/payment/${payment.paymentId}`);
  check(
    "Ordinary polling keeps the unpaid QR",
    polled.paymentStatus === "PAYABLE" && !polled.verificationPending && !!polled.qrCodeData,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "payment-mobile.png"), fullPage: true });
  check(
    "Mobile fits the viewport",
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await request(`/api/account/orders/${orderId}`, "PUT", {
    reason: "SePay QA: hủy đơn thử chưa chuyển tiền",
  });
  cancelled = true;
  const closed = await request(`/api/checkout/payment/${payment.paymentId}`);
  check("Cancellation closes QR", closed.orderStatus === "CANCELLED" && !closed.qrCodeData);
  await page.reload();
  await page.getByRole("heading", { name: "Thanh toán không thành công", exact: true }).waitFor();
  check("No QR on cancelled order", (await page.locator(".sepay-transfer").count()) === 0);
  const cartAfter = await request("/api/cart/items");
  check("Original cart preserved", JSON.stringify(cart.items) === JSON.stringify(cartAfter.items));
  await writeFile(resolve(output, "checks.json"), JSON.stringify({ orderId, checks }, null, 2));
  console.log(JSON.stringify({ orderId, checks }, null, 2));
} finally {
  if (orderId && !cancelled)
    await request(`/api/account/orders/${orderId}`, "PUT", { reason: "SePay QA cleanup" });
  await browser.close();
}
