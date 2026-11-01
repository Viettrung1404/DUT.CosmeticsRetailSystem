import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  beginWishlistRemoval,
  emptyCart,
  optimisticCartAdd,
  optimisticCartChange,
  optimisticCartSelection,
  updateWishlistIds,
} from "@/features/catalog/commerce-state";

const item = {
  id: "line-1",
  productVariantId: "variant-1",
  productName: "Kem dưỡng",
  quantity: 2,
  currentPrice: 100_000,
  totalPrice: 200_000,
  isAvailable: true,
  isSelected: true,
  priceChanged: false,
  isQuantityExceeded: false,
};

describe("commerce optimistic cache", () => {
  it("updates cart totals immediately for add, quantity, selection and delete", () => {
    const cart = {
      ...emptyCart(),
      items: [item],
      totalQuantity: 2,
      subtotal: 200_000,
      selectedQuantity: 2,
      selectedSubtotal: 200_000,
    };
    expect(optimisticCartAdd(cart, 1)).toMatchObject({
      totalQuantity: 3,
      selectedQuantity: 2,
    });
    const changed = optimisticCartChange(cart, item.id, "PUT", { quantity: 1 });
    expect(changed).toMatchObject({ totalQuantity: 1, subtotal: 100_000, selectedQuantity: 1 });
    expect(optimisticCartSelection(cart, false)).toMatchObject({
      totalQuantity: 2,
      selectedQuantity: 0,
      selectedSubtotal: 0,
    });
    expect(optimisticCartChange(cart, item.id, "DELETE")).toMatchObject({
      totalQuantity: 0,
      subtotal: 0,
      items: [],
    });
  });

  it("updates favorite count across cached views and can roll back", async () => {
    const client = new QueryClient();
    client.setQueryData(["wishlist-ids"], { ids: ["a", "b"] });
    client.setQueryData(["wishlist", "drawer"], {
      items: [{ id: "a" }, { id: "b" }],
      page: 1,
      limit: 100,
      total: 2,
    });
    const rollback = await beginWishlistRemoval(client, ["a"]);
    expect(client.getQueryData(["wishlist-ids"])).toEqual({ ids: ["b"] });
    expect(client.getQueryData(["wishlist", "drawer"])).toMatchObject({
      items: [{ id: "b" }],
      total: 1,
    });
    rollback();
    expect(client.getQueryData(["wishlist-ids"])).toEqual({ ids: ["a", "b"] });
    expect(client.getQueryData(["wishlist", "drawer"])).toMatchObject({ total: 2 });
    expect(updateWishlistIds({ ids: ["a"] }, "a", true)).toEqual({ ids: ["a"] });
    client.clear();
  });
});
