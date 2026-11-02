import { expect, test, type Page } from "@playwright/test";

const variantId = "9c9592e4-098e-432b-a043-ce8c559f4cbb";
const addressId = "9c9592e4-098e-432b-a043-ce8c559f4cba";
const saved = {
  id: addressId,
  recipientName: "Nguyễn An",
  phone: "0901234567",
  city: "Thành phố Hồ Chí Minh",
  ward: "Phường Sài Gòn",
  district: "",
  addressLine: "12 Nguyễn Huệ",
  label: "Nhà riêng",
  isDefault: true,
  latitude: null,
  longitude: null,
};

async function checkout(page: Page, signedIn = true) {
  let addresses = [saved];
  const previews: { couponCode?: string; usePoints?: number }[] = [];
  const addressWrites: Record<string, unknown>[] = [];
  await page.route("**/api/auth/session", (route) =>
    route.fulfill(
      signedIn
        ? {
            json: {
              user: { id: "customer-test", email: "test@example.com", fullName: "Nguyễn An" },
            },
          }
        : { status: 401, json: { code: "UNAUTHORIZED" } },
    ),
  );
  await page.route("**/api/cart/items", (route) =>
    route.fulfill({
      json: {
        id: "cart",
        totalQuantity: 1,
        subtotal: 400000,
        items: [
          {
            id: "line",
            productVariantId: variantId,
            productName: "Kem dưỡng GlowUp",
            variantName: "50ml",
            quantity: 1,
            currentPrice: 400000,
            totalPrice: 400000,
            isAvailable: true,
            isSelected: true,
          },
        ],
      },
    }),
  );
  await page.route("**/api/checkout/payment", (route) =>
    route.fulfill({ json: { COD: true, SEPAY: true } }),
  );
  await page.route("**/api/account/addresses", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      addressWrites.push(body);
      const address = { ...saved, ...body, id: variantId };
      addresses = [...addresses, address];
      return route.fulfill({ status: 201, json: address });
    }
    return route.fulfill({ json: addresses });
  });
  await page.route("**/api/checkout/benefits", (route) =>
    route.fulfill({
      json: {
        coupons: [
          {
            id: variantId,
            code: "SAVE30",
            discountType: "FIXED_AMOUNT",
            discountValue: 30000,
            minOrderAmount: 300000,
            maxDiscountAmount: null,
            endDate: "2027-11-01T00:00:00.000Z",
          },
        ],
        points: { balance: 200000, value: 1, minimumBalance: 50000, step: 10000, maxRatio: 0.5 },
      },
    }),
  );
  await page.route("**/api/checkout/preview", (route) => {
    const input = route.request().postDataJSON();
    previews.push(input);
    if (input.couponCode === "INVALID")
      return route.fulfill({ status: 400, json: { code: "COUPON_NOT_AVAILABLE" } });
    const coupon = input.couponCode === "SAVE30" ? 30000 : 0;
    return route.fulfill({
      json: {
        quoteVersion: "a".repeat(64),
        subtotal: 400000,
        lineDiscount: 20000,
        couponDiscount: coupon,
        discountAmount: 20000 + coupon,
        pointsDiscount: input.usePoints ?? 0,
        shippingFee: 30000,
        totalAmount: 410000 - coupon - (input.usePoints ?? 0),
        items: [
          {
            productVariantId: variantId,
            productName: "Kem dưỡng GlowUp",
            quantity: 1,
            totalPrice: 380000,
          },
        ],
      },
    });
  });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
  await page.goto("/checkout");
  await expect(page.locator(".checkout-grand-total")).toContainText("410.000");
  return { previews, addressWrites };
}

test("guest uses province/ward dropdowns and can pin a delivery point without a district", async ({
  page,
}) => {
  await checkout(page, false);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanh toán");
  await expect(page.getByLabel(/Quận/)).toHaveCount(0);
  await expect(page.locator("#delivery-city option")).toHaveCount(35);
  await expect(page.locator("#delivery-ward")).toBeDisabled();
  await page.locator("#delivery-city").selectOption("79");
  await page.locator("#delivery-ward").selectOption({ label: "Phường Sài Gòn" });
  await page.getByRole("button", { name: "Chọn vị trí trên bản đồ" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.locator(".delivery-map-canvas").click({ position: { x: 140, y: 120 } });
  await expect(page.locator(".delivery-map-caption")).toContainText("Đã ghim:");
  await page.locator("#delivery-city").selectOption("48");
  await expect(page.locator("#delivery-ward")).toHaveValue("");
  await expect(page.locator(".delivery-map-caption")).not.toContainText("Đã ghim:");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("signed-in customer selects saved addresses and adds a two-level address with map coordinates", async ({
  page,
}) => {
  const state = await checkout(page);
  await expect(page.locator(".checkout-address-card input[type=radio]")).toBeChecked();
  await expect(page.locator("#delivery-name")).toHaveCount(0);
  await page.getByRole("button", { name: "Thêm địa chỉ mới", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Họ và tên người nhận/).fill("Trần Bình");
  await dialog.getByLabel(/Số điện thoại/).fill("0912345678");
  await dialog.locator("#saved-address-city").selectOption("79");
  await dialog.locator("#saved-address-ward").selectOption({ label: "Phường Sài Gòn" });
  await dialog.getByLabel(/Số nhà, tên đường/).fill("25 Nguyễn Huệ");
  await dialog.getByRole("button", { name: "Chọn vị trí trên bản đồ" }).click();
  await expect(dialog.locator(".leaflet-container")).toBeVisible();
  await dialog.locator(".delivery-map-canvas").click({ position: { x: 140, y: 110 } });
  await expect(dialog.locator(".delivery-map-caption")).toContainText("Đã ghim:");
  await dialog.getByRole("button", { name: "Lưu và sử dụng địa chỉ" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".checkout-address-card.is-selected")).toContainText("Trần Bình");
  expect(state.addressWrites[0]).toMatchObject({
    district: "",
    city: "Thành phố Hồ Chí Minh",
    ward: "Phường Sài Gòn",
    latitude: expect.any(Number),
    longitude: expect.any(Number),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("voucher entry is explicit, invalid codes preserve the quote, wallet and coins update the server quote", async ({
  page,
}) => {
  const { previews } = await checkout(page);
  const input = page.getByRole("textbox", { name: "Mã ưu đãi", exact: true });
  await expect(input).toHaveValue("");
  await input.fill("INVALID");
  expect(previews.some((input) => input.couponCode === "INVALID")).toBe(false);
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.locator(".checkout-inline-error")).toBeVisible();
  await expect(page.locator(".checkout-grand-total")).toContainText("410.000");
  await page.getByRole("button", { name: "Chọn mã ưu đãi" }).click();
  await page.getByRole("button", { name: "Dùng mã", exact: true }).click();
  await expect(page.locator(".checkout-applied-coupon")).toContainText("SAVE30");
  await expect(page.locator(".checkout-grand-total")).toContainText("380.000");
  const coins = page.getByRole("switch", { name: "Sử dụng xu GlowUp" });
  await expect(coins).toBeEnabled();
  await coins.click();
  await expect(page.getByRole("slider", { name: "Số xu muốn sử dụng" })).toHaveValue("170000");
  await expect(page.locator(".checkout-grand-total")).toContainText("210.000");
  expect(
    previews.some((input) => input.couponCode === "SAVE30" && input.usePoints === 170000),
  ).toBe(true);
  await expect(page.locator(".checkout-price-breakdown")).toContainText("Theo chính sách cửa hàng");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
