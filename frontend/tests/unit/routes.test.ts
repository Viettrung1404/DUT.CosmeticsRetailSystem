import { expect, it } from "vitest";
import { cmsPath, resourceRoutes, screenInventory } from "@/shared/config/routes";

it("keeps CMS slugs out of reserved routes and requires a published allowlist", () => {
  expect(cmsPath("return-policy", ["return-policy"])).toBe("/return-policy");
  for (const slug of ["account", "api", "dev", "_next", "products", "../login", "https://evil.test", "unpublished"]) {
    expect(cmsPath(slug, ["account", "api", "dev", "_next", "products", "../login", "https://evil.test"])).toBeNull();
  }
});

it("encodes resource identifiers without introducing another path or query", () => {
  expect(resourceRoutes.order("a/b?admin=true")).toBe("/account/orders/a%2Fb%3Fadmin%3Dtrue");
});

it("covers the blueprint without turning the mini-cart into a page", () => {
  expect(new Set(screenInventory.map((screen) => screen.id)).size).toBe(46);
  expect(screenInventory.find((screen) => screen.id === "S24")?.routes).toEqual([]);
  expect(screenInventory.find((screen) => screen.id === "S28")?.routes).toEqual(["/forgot-password", "/reset-password"]);
  expect(screenInventory.filter((screen) => screen.id.startsWith("B"))).toHaveLength(5);
});
