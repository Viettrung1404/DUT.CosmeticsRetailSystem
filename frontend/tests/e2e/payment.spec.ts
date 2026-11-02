import { expect, test } from "@playwright/test";

const paymentId = "9c9592e4-098e-432b-a043-ce8c559f4cbb";
const reference = `GU${"A".repeat(32)}`;

function payment(mode: "live" | "sandbox" = "live") {
  return {
    paymentId,
    orderId: paymentId,
    method: "SEPAY",
    status: "PAYABLE",
    paymentStatus: "PAYABLE",
    orderStatus: "PENDING_PAYMENT",
    paymentUrl: null,
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    verificationPending: false,
    refundPending: false,
    qrCodeData: JSON.stringify({
      bank: "ACB",
      accountNumber: "0123456789",
      accountName: "GLOWUP TEST",
      amount: 221000,
      content: reference,
      mode,
    }),
  };
}

test("VietQR shows exact transfer details, copies reference and fits the viewport", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route(`**/api/checkout/payment/${paymentId}`, (route) =>
    route.fulfill({ json: payment() }),
  );
  // Test the image boundary without depending on the external image service.
  await page.route("https://vietqr.app/img?**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360"/>',
    }),
  );
  await page.goto(`/payment/return?paymentId=${paymentId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thanh toán đơn hàng bằng VietQR",
  );
  const image = page.getByRole("img", { name: "Mã VietQR chuyển khoản thanh toán đơn hàng" });
  const url = new URL((await image.getAttribute("src"))!);
  expect(url.searchParams.get("amount")).toBe("221000");
  expect(url.searchParams.get("des")).toBe(reference);
  expect(url.searchParams.get("acc")).toBe("0123456789");
  await page.getByRole("button", { name: "Sao chép nội dung chuyển khoản" }).click();
  await expect(page.getByText("Đã sao chép nội dung chuyển khoản.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("sandbox shows a labelled test QR and links to the transaction simulator", async ({
  page,
}) => {
  await page.route("https://vietqr.app/img?**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360"/>',
    }),
  );
  await page.route(`**/api/checkout/payment/${paymentId}`, (route) =>
    route.fulfill({ json: payment("sandbox") }),
  );
  await page.goto(`/payment/return?paymentId=${paymentId}`);
  await expect(page.getByText(/Chế độ thử nghiệm — không chuyển tiền thật/)).toBeVisible();
  await expect(page.getByRole("img", { name: "Mã VietQR thử nghiệm SePay" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở dashboard SePay" })).toHaveAttribute(
    "href",
    "https://my.sepay.vn",
  );
});

test("expired transfers hide the QR and copy controls", async ({ page }) => {
  await page.route(`**/api/checkout/payment/${paymentId}`, (route) =>
    route.fulfill({ json: { ...payment(), expiresAt: new Date(Date.now() - 1000).toISOString() } }),
  );
  await page.goto(`/payment/return?paymentId=${paymentId}`);
  await expect(page.getByText(/Đã hết thời gian thanh toán/)).toBeVisible();
  await expect(page.getByRole("img", { name: /Mã VietQR/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sao chép/ })).toHaveCount(0);
});

test("polling recovers after a connection error and hides instructions once confirmed", async ({
  page,
}) => {
  let recover = false;
  await page.route(`**/api/checkout/payment/${paymentId}`, (route) => {
    return !recover
      ? route.fulfill({ status: 503, json: { message: "Temporarily unavailable" } })
      : route.fulfill({
          json: {
            ...payment(),
            paymentStatus: "COMPLETED",
            status: "COMPLETED",
            orderStatus: "PENDING",
          },
        });
  });
  await page.goto(`/payment/return?paymentId=${paymentId}`);
  await expect(page.locator(".cart-warning[role=alert]")).toContainText(
    "Chưa tra cứu được trạng thái thanh toán",
  );
  recover = true;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanh toán thành công!");
  await expect(
    page.getByText("Đã nhận đủ thanh toán. Đơn hàng đang chờ cửa hàng xác nhận."),
  ).toBeVisible();
  await expect(page.locator(".sepay-transfer")).toHaveCount(0);
  await expect(page.locator(".cart-warning[role=alert]")).toHaveCount(0);
});

test("transfers awaiting verification hide the payment instructions", async ({ page }) => {
  await page.route(`**/api/checkout/payment/${paymentId}`, (route) =>
    route.fulfill({ json: { ...payment(), verificationPending: true } }),
  );
  await page.goto(`/payment/return?paymentId=${paymentId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giao dịch đang chờ xác nhận");
  await expect(page.locator(".sepay-transfer")).toHaveCount(0);
});
