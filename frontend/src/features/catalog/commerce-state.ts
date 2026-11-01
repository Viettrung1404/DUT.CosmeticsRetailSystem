import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { readBff } from "@/shared/api/browser";
import { cartSchema } from "./cart";
import { wishlistSchema } from "@/features/post-purchase/contracts";

export const wishlistIdsSchema = z.object({ ids: z.array(z.string()) });
export type WishlistIds = z.infer<typeof wishlistIdsSchema>;
export type Cart = z.infer<typeof cartSchema>;
type WishlistPage = z.infer<typeof wishlistSchema>;

export const emptyCart = (): Cart => ({
  id: "",
  totalQuantity: 0,
  subtotal: 0,
  selectedQuantity: 0,
  selectedSubtotal: 0,
  hasPriceChanges: false,
  items: [],
  unavailableItems: [],
});

export const cartQuery = () =>
  queryOptions({
    queryKey: ["cart"] as const,
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });

export const wishlistIdsQuery = () =>
  queryOptions({
    queryKey: ["wishlist-ids"] as const,
    queryFn: ({ signal }) => readBff("/api/wishlist/ids", wishlistIdsSchema, signal),
  });

export function updateWishlistIds(current: WishlistIds | undefined, id: string, selected: boolean) {
  const ids = current?.ids ?? [];
  return { ids: selected ? [...new Set([...ids, id])] : ids.filter((item) => item !== id) };
}

export async function beginWishlistRemoval(client: QueryClient, ids: string[]) {
  await Promise.all([
    client.cancelQueries({ queryKey: ["wishlist"] }),
    client.cancelQueries({ queryKey: ["wishlist-ids"] }),
  ]);
  const removed = new Set(ids);
  const oldIds = client.getQueryData<WishlistIds>(["wishlist-ids"]);
  const oldPages = client.getQueriesData<WishlistPage>({ queryKey: ["wishlist"] });
  client.setQueryData<WishlistIds>(["wishlist-ids"], (current) => ({
    ids: (current?.ids ?? []).filter((id) => !removed.has(id)),
  }));
  client.setQueriesData<WishlistPage>({ queryKey: ["wishlist"] }, (current) => {
    if (!current) return current;
    const items = current.items.filter((item) => !removed.has(item.id));
    return { ...current, items, total: Math.max(0, current.total - removed.size) };
  });
  return () => {
    if (oldIds) client.setQueryData(["wishlist-ids"], oldIds);
    for (const [key, page] of oldPages) client.setQueryData(key, page);
  };
}

type CartItem = Cart["items"][number];

function withTotals(cart: Cart, items: CartItem[], unavailableItems: CartItem[]): Cart {
  const all = [
    ...items,
    ...unavailableItems.filter((item) => !items.some((row) => row.id === item.id)),
  ];
  const selected = items.filter((item) => item.isSelected && item.isAvailable);
  return {
    ...cart,
    items,
    unavailableItems,
    totalQuantity: all.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: all.reduce((sum, item) => sum + item.totalPrice, 0),
    selectedQuantity: selected.reduce((sum, item) => sum + item.quantity, 0),
    selectedSubtotal: selected.reduce((sum, item) => sum + item.totalPrice, 0),
  };
}

export function optimisticCartChange(
  cart: Cart,
  id: string,
  method: "PUT" | "DELETE",
  input: { quantity?: number; isSelected?: boolean } = {},
): Cart {
  const change = (items: CartItem[]) =>
    items.flatMap((item) => {
      if (item.id !== id) return [item];
      if (method === "DELETE") return [];
      const quantity = input.quantity ?? item.quantity;
      return [
        {
          ...item,
          quantity,
          totalPrice: item.currentPrice * quantity,
          isSelected: input.isSelected ?? item.isSelected,
        },
      ];
    });
  return withTotals(cart, change(cart.items), change(cart.unavailableItems));
}

export function optimisticCartSelection(cart: Cart, selected: boolean): Cart {
  return withTotals(
    cart,
    cart.items.map((item) => (item.isAvailable ? { ...item, isSelected: selected } : item)),
    cart.unavailableItems,
  );
}

export function optimisticCartAdd(cart: Cart, quantity: number): Cart {
  // The add endpoint returns only a count. Keep existing rows intact until the full cart refetch.
  return { ...cart, totalQuantity: cart.totalQuantity + quantity };
}
