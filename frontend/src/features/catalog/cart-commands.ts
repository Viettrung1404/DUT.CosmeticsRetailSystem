import type { QueryClient } from "@tanstack/react-query";
import { requestBff } from "@/shared/api/browser";
import { cartSchema } from "./cart";
import { optimisticCartChange, type Cart } from "./commerce-state";

export type CartChange = {
  id: string;
  method: "PUT" | "DELETE";
  body?: { quantity?: number; isSelected?: boolean };
};

type Pending = CartChange & { onError: (error: unknown) => void };
type Queue = { pending: Pending[]; committed: Cart; running: boolean };

const queues = new WeakMap<QueryClient, Queue>();

function apply(cart: Cart, change: CartChange) {
  return optimisticCartChange(cart, change.id, change.method, change.body);
}

export function queueCartChanges(
  client: QueryClient,
  changes: CartChange[],
  onError: (error: unknown) => void,
) {
  if (!changes.length) return;
  const cart = client.getQueryData<Cart>(["cart"]);
  if (!cart) return;
  void client.cancelQueries({ queryKey: ["cart"] });
  let queue = queues.get(client);
  if (!queue) {
    queue = { pending: [], committed: cart, running: false };
    queues.set(client, queue);
  }
  queue.pending.push(...changes.map((change) => ({ ...change, onError })));
  client.setQueryData<Cart>(["cart"], (current) => changes.reduce(apply, current ?? cart));
  if (!queue.running) void flush(client, queue);
}

async function flush(client: QueryClient, queue: Queue) {
  queue.running = true;
  try {
    while (queue.pending.length) {
      const change = queue.pending[0];
      if (!change) break;
      try {
        queue.committed = await requestBff(`/api/cart/items/${change.id}`, cartSchema, {
          method: change.method,
          body: change.body,
        });
      } catch (error) {
        change.onError(error);
      } finally {
        queue.pending.shift();
        client.setQueryData<Cart>(["cart"], queue.pending.reduce(apply, queue.committed));
      }
    }
  } finally {
    queues.delete(client);
    void client.invalidateQueries({ queryKey: ["cart"] });
  }
}
