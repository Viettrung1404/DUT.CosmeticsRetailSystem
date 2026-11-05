import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Fixture = { email: string; otherEmail: string; password: string; variantId: string; price: number; shippingFee: number };
const origin = "https://127.0.0.1:3301";
const fixture = () => JSON.parse(readFileSync(resolve("../.tmp/development-readiness/fullstack-fixture.json"), "utf8")) as Fixture;
let otherStorage: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;

async function fillAddress(page: Page, prefix = "delivery") {
  await page.locator(`#${prefix}-name`).fill("Readiness Buyer");
  await page.locator(`#${prefix}-phone`).fill("0901234567");
  await page.locator(`#${prefix}-city`).selectOption("79");
  await page.locator(`#${prefix}-ward`).selectOption({ label: "Phường Sài Gòn" });
  await page.locator(`#${prefix}-line`).fill("12 Nguyen Hue - Test only");
}

for (const kind of ["customer", "guest"] as const) {
  test(`${kind} buys COD through browser, BFF, real API, PostgreSQL and Redis`, async ({ page, browser }, testInfo) => {
    const data = fixture();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (kind === "customer") {
      const login = await page.request.post("/api/auth/login", {
        headers: { origin }, data: { email: data.email, password: data.password },
      });
      expect(login.status(), await login.text()).toBe(200);
    }
    const cart = await page.request.post("/api/cart/items", {
      headers: { origin }, data: { productVariantId: data.variantId, quantity: 1 },
    });
    expect(cart.status(), await cart.text()).toBe(200);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanh toán");
    if (kind === "customer") {
      await page.getByRole("button", { name: "Thêm địa chỉ mới", exact: true }).click();
      await fillAddress(page, "saved-address");
      await page.getByRole("button", { name: "Lưu và sử dụng địa chỉ", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      await fillAddress(page);
    }
    await expect(page.locator(".checkout-grand-total")).toContainText("130.000");
    const created = page.waitForResponse((response) => response.url().endsWith("/api/checkout/order") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Đặt hàng COD", exact: true }).click();
    const reply = await created;
    expect(reply.status(), await reply.text()).toBe(201);
    const order = await reply.json();
    expect(order.totalAmount).toBe(data.price + data.shippingFee);
    expect(order.status).toBe("PENDING");
    await expect(page).toHaveURL(new RegExp(`/order-success/${order.id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đơn hàng đang chờ xác nhận");
    const owned = await page.request.get(`/api/checkout/order/${order.id}`);
    expect(owned.status()).toBe(200);
    expect((await owned.json()).totalAmount).toBe(130000);

    const foreign = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
    try {
      expect((await foreign.request.get(`/api/checkout/order/${order.id}`)).status()).toBeGreaterThanOrEqual(400);
      if (otherStorage) {
        await foreign.addCookies(otherStorage.cookies);
      } else {
        const login = await foreign.request.post("/api/auth/login", {
          headers: { origin }, data: { email: data.otherEmail, password: data.password },
        });
        expect(login.status()).toBe(200);
        otherStorage = await foreign.storageState();
      }
      const denied = await foreign.request.get(`/api/checkout/order/${order.id}`);
      expect([403, 404]).toContain(denied.status());
      const deniedBody = await denied.text();
      expect(deniedBody).not.toContain(order.id);
      expect(deniedBody).not.toContain("shippingAddress");
      expect(deniedBody).not.toContain("totalAmount");
    } finally {
      await foreign.close();
    }
    if (kind === "customer") {
      const cancelled = await page.request.put(`/api/account/orders/${order.id}`, {
        headers: { origin }, data: { reason: "Readiness test cleanup" },
      });
      expect(cancelled.status(), await cancelled.text()).toBe(200);
      expect((await cancelled.json()).status).toBe("CANCELLED");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await testInfo.attach("order-evidence", { contentType: "application/json", body: JSON.stringify({ kind, orderId: order.id, totalAmount: order.totalAmount, status: order.status }) });
  });
}
