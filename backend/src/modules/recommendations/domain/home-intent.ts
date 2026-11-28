import { BehaviorEventType } from "@prisma/client";

export const HOME_INTENT_WINDOW_MS = 14 * 86_400_000;
export const HOME_MAX_PAGES = 10;

export interface RecentProductView {
  productId: string;
  viewedAt: number;
  dwellMs: number;
}

interface StoredIntent {
  cartItems: {
    createdAt: Date;
    productVariantId: string;
    variant: { productId: string };
  }[];
  events: {
    productId: string | null;
    variantId: string | null;
    eventType: BehaviorEventType;
    createdAt: Date;
    metadata: unknown;
  }[];
}

interface IntentCandidate {
  productId: string;
  score: number;
  reason: string;
}

export function rankHomeIntent(
  { cartItems, events }: StoredIntent,
  recentViews: readonly RecentProductView[],
  recentIds: readonly string[],
  now: number,
): IntentCandidate[] {
  const ranked = new Map<string, IntentCandidate>();
  const cartAdds = new Map<string, number>();
  const decay = (age: number, halfLifeDays: number) =>
    2 ** (-age / (halfLifeDays * 86_400_000));
  const add = (productId: string, score: number, reason: string) => {
    if (score > (ranked.get(productId)?.score ?? 0)) {
      ranked.set(productId, { productId, score, reason });
    }
  };
  const addView = ({ productId, viewedAt, dwellMs }: RecentProductView) => {
    const age = Math.max(0, now - viewedAt);
    if (age >= HOME_INTENT_WINDOW_MS) return;
    const dwell = Math.min(60_000, Math.max(0, dwellMs));
    const engagement = 0.32 + 0.62 * (Math.log1p(dwell / 4_000) / Math.log(16));
    add(productId, engagement * decay(age, 3), "Bạn đã xem gần đây");
  };

  for (const event of events) {
    if (!event.productId) continue;
    const viewedAt = event.createdAt.getTime();
    if (event.eventType === BehaviorEventType.ADD_TO_CART) {
      if (event.variantId && !cartAdds.has(event.variantId)) {
        cartAdds.set(event.variantId, viewedAt);
      }
    } else if (event.eventType === BehaviorEventType.VIEW_PRODUCT) {
      const metadata = event.metadata;
      const dwellMs =
        metadata && typeof metadata === "object" && "dwellMs" in metadata
          ? metadata.dwellMs
          : undefined;
      addView({
        productId: event.productId,
        viewedAt,
        dwellMs: typeof dwellMs === "number" ? dwellMs : 4_000,
      });
    } else {
      addView({ productId: event.productId, viewedAt, dwellMs: 0 });
    }
  }

  for (const view of recentViews) addView(view);
  recentIds.forEach((productId, index) =>
    add(productId, 0.4 - index * 0.04, "Bạn đã xem gần đây"),
  );

  for (const item of cartItems) {
    const addedAt = Math.max(
      item.createdAt.getTime(),
      cartAdds.get(item.productVariantId) ?? 0,
    );
    const age = Math.max(0, now - addedAt);
    if (age < HOME_INTENT_WINDOW_MS) {
      add(
        item.variant.productId,
        1.1 + 0.65 * decay(age, 5),
        "Vẫn còn trong giỏ hàng của bạn",
      );
    }
  }

  return [...ranked.values()];
}
