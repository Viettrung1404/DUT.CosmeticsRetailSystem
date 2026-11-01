import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";
import { guestWishlistIds, mergeGuestWishlist } from "@/shared/auth/wishlist";
import { wishlistSchema } from "@/features/post-purchase/contracts";

export const runtime = "nodejs";

export async function GET() {
  try {
    try {
      const id = await sessionId();
      if ((await mergeGuestWishlist(id)) === "pending")
        throw new ApiError(503, "WISHLIST_MERGE_PENDING");
      const ids: string[] = [];
      for (let page = 1; ; page++) {
        const result = await authRuntime().broker.read(id, (token) =>
          upstream(`/wishlists?page=${page}&limit=100`, wishlistSchema, undefined, token),
        );
        ids.push(...result.items.map((product) => product.id));
        if (page * 100 >= result.total) break;
      }
      return json({ ids });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      return json({ ids: await guestWishlistIds() });
    }
  } catch (error) {
    return failure(error);
  }
}
