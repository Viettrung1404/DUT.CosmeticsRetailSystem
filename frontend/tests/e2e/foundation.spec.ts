import { expect, test } from "@playwright/test";

test("Vietnamese shell renders without client errors or horizontal overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chăm sóc vẻ đẹp của bạn.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("SSR calls upstream directly and does not send the browser to the backend", async ({ page }) => {
  const upstreamCalls: string[] = [];
  page.on("request", (request) => { if (request.url().includes(":3100")) upstreamCalls.push(request.url()); });
  await page.goto("/dev/backend");
  await expect(page.getByTestId("backend-status")).toHaveAttribute("data-connected", "true");
  expect(upstreamCalls).toEqual([]);
});
