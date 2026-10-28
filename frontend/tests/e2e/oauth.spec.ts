import { expect, test } from "@playwright/test";
import { installOAuthSdk } from "../fixtures/oauth-browser";

for (const provider of ["Google", "Facebook"] as const) {
  test(`${provider} SDK callback creates an opaque session and preserves returnTo (fixture)`, async ({ page, context }) => {
    await installOAuthSdk(page);
    await page.goto("/login?returnTo=/account/addresses");
    await page.route(`**/api/auth/oauth/${provider.toLowerCase()}`, async route => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      expect(await response.text()).not.toMatch(/accessToken|refreshToken|clientNonce|challenge/);
      await route.fulfill({ response });
    });
    await page.getByRole("button", { name: `Tiếp tục với ${provider}`, exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/account/addresses");
    const cookie = (await context.cookies()).find(value => value.name === "glowup-session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value).toMatch(/^[a-f0-9]{64}$/);
  });
}

test("OAuth email challenge requires proof, consumes flow and returns to the requested page (fixture)", async ({ page, context }) => {
  await installOAuthSdk(page, "verify");
  await page.goto("/register?returnTo=/account/addresses");
  await page.getByRole("button", { name: "Tiếp tục với Google", exact: true }).click();
  await expect(page).toHaveURL(/\/oauth\/continue\?/);
  await expect(page.locator("header, footer")).toHaveCount(0);
  expect((await context.cookies()).some(value => value.name === "glowup-session")).toBe(false);
  await page.getByLabel("Email tài khoản").fill("verify-oauth@example.com");
  await page.getByRole("button", { name: "Gửi email xác nhận" }).click();
  await page.getByLabel("Mã xác nhận nhận qua email").fill("x".repeat(64));
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("hết hạn");
  await page.getByLabel("Mã xác nhận nhận qua email").fill("e".repeat(64));
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/account/addresses");
  expect((await context.cookies()).some(value => value.name === "glowup-oauth")).toBe(false);
  await page.goto("/oauth/continue");
  await expect(page.getByRole("heading", { name: "Phiên xác thực đã hết hạn" })).toBeVisible();
});

test("OAuth linking requires login to the target account before proof can succeed (fixture)", async ({ page }) => {
  await installOAuthSdk(page, "link");
  await page.goto("/login");
  await page.getByRole("button", { name: "Tiếp tục với Facebook", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thêm một bước để liên kết tài khoản" })).toBeVisible();
  await page.getByLabel("Email tài khoản").fill("link-oauth@example.com");
  await page.getByRole("button", { name: "Gửi email xác nhận" }).click();
  await page.getByLabel("Mã xác nhận nhận qua email").fill("e".repeat(64));
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("hết hạn");
  await page.getByRole("link", { name: "Đăng nhập tài khoản →" }).click();
  await page.getByLabel("Địa chỉ email").fill("link-oauth@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("GlowUp2026");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/oauth\/continue$/);
  await page.getByLabel("Email tài khoản").fill("link-oauth@example.com");
  await page.getByRole("button", { name: "Gửi email xác nhận" }).click();
  await page.getByLabel("Mã xác nhận nhận qua email").fill("e".repeat(64));
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("provider cancellation and rejection keep email login usable (fixture)", async ({ page, context }) => {
  await installOAuthSdk(page, "cancel");
  await page.goto("/login");
  await page.getByRole("button", { name: "Tiếp tục với Facebook", exact: true }).click();
  await expect(page.locator(".social-auth").getByRole("alert")).toContainText("đã hủy");
  await installOAuthSdk(page, "invalid");
  await page.reload();
  await page.getByLabel("Địa chỉ email").fill("draft@example.com");
  await page.getByRole("button", { name: "Tiếp tục với Google", exact: true }).click();
  await expect(page.locator(".social-auth").getByRole("alert")).toContainText("Không thể xác thực với nhà cung cấp");
  await expect(page.getByLabel("Địa chỉ email")).toHaveValue("draft@example.com");
  expect((await context.cookies()).some(value => value.name === "glowup-session")).toBe(false);
});

test("blocked SDK reports failure and leaves password login available", async ({ page }) => {
  await page.route("https://accounts.google.com/gsi/client?*", route => route.abort());
  await page.route("https://connect.facebook.net/vi_VN/sdk.js", route => route.abort());
  await page.goto("/login");
  await expect(page.locator(".social-auth").getByRole("alert")).toContainText("Chưa thể tải đăng nhập");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Tiếp tục với Facebook/ })).toBeDisabled();
});

test("Facebook SDK refusal on HTTP explains how to switch to HTTPS", async ({ page }) => {
  await installOAuthSdk(page);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Tiếp tục với Facebook", exact: true })).toBeEnabled();
  await page.evaluate(() => { window.FB!.login = () => {}; });
  await page.getByRole("button", { name: "Tiếp tục với Facebook", exact: true }).click();
  await expect(page.locator(".social-auth").getByRole("alert")).toContainText("Facebook yêu cầu HTTPS");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeEnabled();
});
