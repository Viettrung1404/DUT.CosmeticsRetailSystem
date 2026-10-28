import { expect, test } from "@playwright/test";
import { installOAuthSdk } from "../fixtures/oauth-browser";

test.beforeEach(async ({ page }) => { await installOAuthSdk(page); });

test("skincare navbar follows the current HTML pills and keeps search usable", async ({ page, isMobile }, testInfo) => {
  await page.goto("/categories/cham-soc-da");
  await expect(page.locator("header .mobile-only").first()).toBeEnabled();
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính", exact: true });
  const skincare = navigation.getByRole("link", { name: "Chăm Sóc Da Mặt", exact: true });
  await expect(skincare).toHaveAttribute("aria-current", "page");
  await expect(skincare).toHaveCSS("background-color", "rgb(217, 249, 157)");
  await expect(navigation.getByRole("link", { name: "Khuyến mãi hot", exact: true })).toHaveCSS("background-color", "rgb(254, 215, 170)");
  await expect(page.locator(".announcement")).toContainText("Đơn từ 129k→ Freeship 15k");
  if (isMobile) {
    await page.getByRole("button", { name: "Xem tiếp danh mục" }).click();
    await expect.poll(() => page.locator(".nav-pills").evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  } else {
    await page.getByLabel("Xem thêm", { exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Liên kết thêm" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Liên kết thêm" })).not.toBeVisible();
  }
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.locator("header").screenshot({ path: testInfo.outputPath("navbar-code-html.png"), style: "nextjs-portal { display: none; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("search").first().getByRole("searchbox").fill("serum");
  await page.getByRole("search").first().getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=serum$/);
});

test("Stitch auth layouts keep their distinct composition without site chrome", async ({ page }, testInfo) => {
  const hydrationErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text()); });
  await page.goto("/login");
  await expect(page.getByText("Cổng đăng nhập an toàn", { exact: true })).toBeVisible();
  for (const route of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/oauth/continue"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".auth-form")).toHaveAttribute("aria-busy", "false");
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    if (["/forgot-password", "/reset-password", "/verify-email", "/oauth/continue"].includes(route)) {
      await expect(page.locator(".auth-story")).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${route.slice(1).replaceAll("/", "-")}-stitch.png`), fullPage: true, style: "nextjs-portal { display: none; }" });
  }
  expect(hydrationErrors).toEqual([]);
});

test("Stitch failure screens preserve HTTP status and working recovery links", async ({ page }, testInfo) => {
  const missing = await page.goto("/missing-stitch-screen");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Ôi! Trang bạn tìm kiếm không tồn tại" })).toBeVisible();
  await expect(page.locator("header button.mobile-only")).toBeEnabled();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.screenshot({ path: testInfo.outputPath("not-found-stitch.png"), fullPage: true, style: "nextjs-portal { display: none; }" });
  const maintenance = await page.goto("/maintenance");
  expect(maintenance?.status()).toBe(503);
  expect(maintenance?.headers()["retry-after"]).toBe("300");
  await expect(page.getByRole("heading", { name: "GlowUp đang được chăm chút để hoàn hảo hơn!" })).toBeVisible();
  await expect.poll(() => page.locator(".brand img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("maintenance-stitch.png"), fullPage: true });
});

test("all auth routes exclude site header and footer, including after client navigation", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/oauth/continue"]) {
    await page.goto(route);
    await expect(page.locator("header")).toHaveCount(0); await expect(page.locator("footer")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (route === "/login") { await expect(page.locator(".auth-form")).toHaveAttribute("aria-busy", "false"); await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true, style: "nextjs-portal { display: none; }" }); }
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Đăng nhập", exact: true }).first().click();
  await expect(page.locator("header, footer")).toHaveCount(0);
  await page.getByRole("link", { name: "Quay lại trang chủ", exact: true }).click();
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("footer")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("guest private access preserves returnTo and rejects forged CSRF/proxy input", async ({ page, request }) => {
  await page.goto("/account/addresses"); await expect(page).toHaveURL(/login\?returnTo=%2Faccount%2Faddresses/);
  const noOrigin = await request.post("/api/auth/login", { data: { email: "a@example.com", password: "GlowUp2026" } }); expect(noOrigin.status()).toBe(403);
  const foreign = await request.post("/api/auth/login", { headers: { Origin: "https://evil.test" }, data: {} }); expect(foreign.status()).toBe(403);
  const injected = await request.post("/api/auth/login", { headers: { Origin: new URL(page.url()).origin }, data: { email: "a@example.com", password: "GlowUp2026", upstream: "https://evil.test" } }); expect(injected.status()).toBe(400);
  expect((await request.get("/api/auth/refresh-token")).status()).toBe(404);
});
test("sensitive forms cannot submit credentials before hydration", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: testInfo.project.use.baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.locator("header, footer")).toHaveCount(0);
    await expect(page.locator(".auth-form form")).toHaveAttribute("method", "post");
    // Streamed SSR markup can remain hidden without the React stream bootstrap.
    await expect(page.locator(".auth-form form > button.button")).toBeDisabled();
    await expect(page).toHaveURL(`${testInfo.project.use.baseURL}/login`);
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
  const dialog = page.getByRole("region", { name: /Thêm địa chỉ mới|Chỉnh sửa địa chỉ/ });
  await expect(dialog.getByLabel("Tên người nhận")).toBeFocused();
  await dialog.getByLabel("Tên người nhận").fill("Lan FE01"); await dialog.getByLabel("Số điện thoại").fill("0901234567");
  await dialog.getByLabel("Địa chỉ cụ thể").fill("1 Đường A"); await dialog.getByLabel("Tỉnh / Thành phố").fill("Đà Nẵng"); await dialog.getByLabel("Quận / Huyện").fill("Hải Châu"); await dialog.getByLabel("Phường / Xã").fill("Hòa Cường");
  await dialog.getByRole("button", { name: "Lưu địa chỉ" }).click(); await expect(dialog).not.toBeVisible();
  const address = page.locator("article").filter({ hasText: "Lan FE01" }).last(); await expect(address).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("addresses.png"), fullPage: true, style: "nextjs-portal { display: none; }" });
  await address.getByRole("button", { name: "Chỉnh sửa" }).click(); await dialog.getByLabel("Tên người nhận").fill("Lan đã sửa");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("address-editor.png"), fullPage: true, style: "nextjs-portal { display: none; }" });
  await dialog.getByRole("button", { name: "Lưu địa chỉ" }).click(); await expect(page.getByText("Lan đã sửa", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất →" }).click(); await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).find((item) => item.name === "glowup-session")).toBeUndefined();
  await page.getByLabel("Địa chỉ email").fill(`b+${testInfo.project.name}@example.com`); await page.getByLabel(/^Mật khẩu/).fill("GlowUp2026"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/); await expect(page.getByRole("heading", { name: "Xin chào, Bảo" })).toBeVisible();
  await page.goto("/account/addresses"); await expect(page.getByText("Lan đã sửa", { exact: true })).toHaveCount(0);
});
test("mobile menu closes with Escape and restores its trigger", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/"); const trigger = page.getByRole("button", { name: "Mở menu" }); await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(trigger).toBeFocused();
});
