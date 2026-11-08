import { expect, test } from "@playwright/test";

const tile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
  "base64",
);
const primaryTile = (url: URL) =>
  url.hostname.endsWith("tile.openstreetmap.org") ||
  (url.hostname.endsWith("google.com") && url.pathname.startsWith("/vt/"));
const fallbackTile = (url: URL) => url.hostname === "server.arcgisonline.com";

test("store map replaces an unreachable configured provider with one fallback layer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(primaryTile, (route) => route.abort("connectionrefused"));
  await page.route(fallbackTile, (route) =>
    route.fulfill({ contentType: "image/png", body: tile }),
  );
  await page.goto("/stores");
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.locator(".leaflet-tile-pane > .leaflet-layer")).toHaveCount(1);
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Esri");
  await page.getByTitle("Phóng to", { exact: true }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await page.goto("/");
  expect(errors).toEqual([]);
});

test("store map explains provider failure and can retry without duplicating layers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let recovered = false;
  await page.route(primaryTile, (route) => route.abort("connectionrefused"));
  await page.route(fallbackTile, (route) =>
    recovered
      ? route.fulfill({ contentType: "image/png", body: tile })
      : route.abort("connectionrefused"),
  );
  await page.goto("/stores");
  await expect(page.getByRole("status").filter({ hasText: "Chưa tải được bản đồ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Google Maps chỉ đường" })).toHaveAttribute(
    "href",
    /maps/,
  );
  recovered = true;
  await page.getByRole("button", { name: "Thử tải lại bản đồ" }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử tải lại bản đồ" })).toHaveCount(0);
  await expect(page.locator(".leaflet-tile-pane > .leaflet-layer")).toHaveCount(1);
  expect(errors).toEqual([]);
});
