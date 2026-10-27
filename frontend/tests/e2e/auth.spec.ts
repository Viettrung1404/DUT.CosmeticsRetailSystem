import { expect, test } from "@playwright/test";

test("auth screens share the shell and remain usable on each viewport", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/oauth/continue"]) {
    await page.goto(route);
    await expect(page.locator("header")).toHaveCount(1); await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (route === "/login") await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  }
  expect(errors).toEqual([]);
});
test("guest private access preserves returnTo and rejects forged CSRF/proxy input", async ({ page, request }) => {
  await page.goto("/account/addresses"); await expect(page).toHaveURL(/login\?returnTo=%2Faccount%2Faddresses/);
  const noOrigin = await request.post("/api/auth/login", { data: { email: "a@example.com", password: "GlowUp2026" } }); expect(noOrigin.status()).toBe(403);
  const foreign = await request.post("/api/auth/login", { headers: { Origin: "https://evil.test" }, data: {} }); expect(foreign.status()).toBe(403);
  const injected = await request.post("/api/auth/login", { headers: { Origin: "http://localhost:3001" }, data: { email: "a@example.com", password: "GlowUp2026", upstream: "https://evil.test" } }); expect(injected.status()).toBe(400);
  expect((await request.get("/api/auth/refresh-token")).status()).toBe(404);
});
test("sensitive forms cannot submit credentials before hydration", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3001/login");
    await expect(page.locator(".auth-form form")).toHaveAttribute("method", "post");
    // Streamed SSR markup can remain hidden without the React stream bootstrap.
    await expect(page.locator(".auth-form form > button.button")).toBeDisabled();
    await expect(page).toHaveURL("http://localhost:3001/login");
  } finally { await context.close(); }
});
test("validation, wrong credentials, network errors and Retry-After retain the draft", async ({ page }) => {
  await page.goto("/login"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Địa chỉ email không hợp lệ.")).toBeVisible();
  await page.getByLabel("Địa chỉ email").fill("a@example.com"); await page.getByLabel(/^Mật khẩu/).fill("WrongPass2026");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.locator("#auth-feedback")).toContainText("Email hoặc mật khẩu không đúng");
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue("a@example.com");
  await page.getByLabel("Địa chỉ email").fill("offline@example.com"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.locator("#auth-feedback")).toContainText("Chưa thể kết nối");
  await expect(page.getByLabel(/^Mật khẩu/)).toHaveValue("WrongPass2026");
  await page.getByLabel("Địa chỉ email").fill("limited@example.com"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.getByRole("button", { name: /Vui lòng chờ/ })).toBeDisabled();
});
test("registration uses an email link, verification is explicit and expired reset can recover", async ({ page }) => {
  await page.goto("/register"); await page.getByLabel("Họ và tên").fill("Lan"); await page.getByLabel("Địa chỉ email").fill("a@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("GlowUp2026"); await page.getByLabel("Xác nhận mật khẩu").fill("GlowUp2026");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click(); await expect(page.getByRole("status")).toContainText("mở liên kết xác thực");
  await page.goto("/verify-email?token=valid"); await expect(page).toHaveURL(/\/verify-email$/);
  await page.getByRole("button", { name: "Xác thực email", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Email đã được xác thực");
  await page.goto("/reset-password?token=expired"); await page.getByLabel("Mật khẩu mới").fill("GlowUp2026"); await page.getByLabel("Xác nhận mật khẩu").fill("GlowUp2026");
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click(); await expect(page.locator("#auth-feedback")).toContainText("hết hạn"); await expect(page.getByRole("link", { name: "Yêu cầu liên kết mới" })).toBeVisible();
});
test("opaque login cookie, address CRUD, logout and user switch isolate private data", async ({ page, context }, testInfo) => {
  await page.goto("/login?returnTo=/account/addresses");
  await page.getByLabel("Địa chỉ email").fill(`a+${testInfo.project.name}@example.com`); await page.getByLabel(/^Mật khẩu/).fill("GlowUp2026");
  await page.route("**/api/auth/login", async (route) => {
    const response = await route.fetch();
    expect(await response.text()).not.toMatch(/accessToken|refreshToken/);
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/account\/addresses$/); await expect(page.getByRole("heading", { name: /Sổ địa chỉ của tôi/ })).toBeVisible();
  const cookie = (await context.cookies()).find((item) => item.name === "glowup-session");
  expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe("Lax"); expect(cookie?.value).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Thêm địa chỉ mới", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Tên người nhận").fill("Lan FE01"); await dialog.getByLabel("Số điện thoại").fill("0901234567");
  await dialog.getByLabel("Địa chỉ cụ thể").fill("1 Đường A"); await dialog.getByLabel("Tỉnh / Thành phố").fill("Đà Nẵng"); await dialog.getByLabel("Quận / Huyện").fill("Hải Châu"); await dialog.getByLabel("Phường / Xã").fill("Hòa Cường");
  await dialog.getByRole("button", { name: "Lưu địa chỉ" }).click(); await expect(dialog).not.toBeVisible();
  const address = page.locator("article").filter({ hasText: "Lan FE01" }).last(); await expect(address).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("addresses.png"), fullPage: true });
  await address.getByRole("button", { name: "Chỉnh sửa" }).click(); await dialog.getByLabel("Tên người nhận").fill("Lan đã sửa"); await dialog.getByRole("button", { name: "Lưu địa chỉ" }).click(); await expect(page.getByText("Lan đã sửa", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất →" }).click(); await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).find((item) => item.name === "glowup-session")).toBeUndefined();
  await page.getByLabel("Địa chỉ email").fill(`b+${testInfo.project.name}@example.com`); await page.getByLabel(/^Mật khẩu/).fill("GlowUp2026"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/); await expect(page.getByRole("heading", { name: "Xin chào, Bảo" })).toBeVisible();
  await page.goto("/account/addresses"); await expect(page.getByText("Lan đã sửa", { exact: true })).toHaveCount(0);
});
test("mobile menu closes with Escape and restores its trigger", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/login"); const trigger = page.getByRole("button", { name: "Mở menu" }); await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(trigger).toBeFocused();
});
