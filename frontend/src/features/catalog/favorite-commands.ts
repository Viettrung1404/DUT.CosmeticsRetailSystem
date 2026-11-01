import type { QueryClient } from "@tanstack/react-query";
import { requestBff } from "@/shared/api/browser";
import { wishlistResultSchema } from "@/features/post-purchase/contracts";
import { updateWishlistIds, type WishlistIds } from "./commerce-state";

type Pending = {
  desired: boolean;
  committed: boolean;
  revision: number;
  slug: string;
  onError: (error: unknown) => void;
};

const queues = new WeakMap<QueryClient, Map<string, Pending>>();

function entries(client: QueryClient) {
  let queue = queues.get(client);
  if (!queue) {
    queue = new Map();
    queues.set(client, queue);
  }
  return queue;
}

export function queueFavorite(
  client: QueryClient,
  productId: string,
  slug: string,
  selected: boolean,
  onError: (error: unknown) => void,
) {
  const queue = entries(client);
  const current = queue.get(productId);
  // Cancel a stale GET before publishing the desired state to every heart and the header.
  void client.cancelQueries({ queryKey: ["wishlist-ids"] });
  client.setQueryData<WishlistIds>(["wishlist-ids"], (value) =>
    updateWishlistIds(value, productId, selected),
  );
  if (current) {
    current.desired = selected;
    current.revision += 1;
    current.onError = onError;
    return;
  }
  const pending: Pending = {
    desired: selected,
    committed: !selected,
    revision: 1,
    slug,
    onError,
  };
  queue.set(productId, pending);
  void flush(client, productId, pending, queue);
}

async function flush(
  client: QueryClient,
  productId: string,
  pending: Pending,
  queue: Map<string, Pending>,
) {
  try {
    for (;;) {
      const desired = pending.desired;
      const revision = pending.revision;
      try {
        const result = await requestBff(`/api/wishlist/${productId}`, wishlistResultSchema, {
          method: "PUT",
          body: {
            productId,
            slug: pending.slug,
            selected: desired,
            idempotencyKey: crypto.randomUUID(),
          },
        });
        pending.committed = result.isWishlisted;
        if (revision === pending.revision) {
          client.setQueryData<WishlistIds>(["wishlist-ids"], (value) =>
            updateWishlistIds(value, productId, result.isWishlisted),
          );
          break;
        }
      } catch (error) {
        if (revision !== pending.revision) continue;
        client.setQueryData<WishlistIds>(["wishlist-ids"], (value) =>
          updateWishlistIds(value, productId, pending.committed),
        );
        pending.onError(error);
        break;
      }
    }
  } finally {
    queue.delete(productId);
    if (queue.size === 0) {
      void client.invalidateQueries({ queryKey: ["wishlist-ids"] });
      void client.invalidateQueries({ queryKey: ["wishlist"] });
    }
  }
}
