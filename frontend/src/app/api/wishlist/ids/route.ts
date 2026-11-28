import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";
import { guestWishlistIds, mergeGuestWishlist } from "@/shared/auth/wishlist";

export const runtime = "nodejs";

const idsResultSchema = z.object({ ids: z.array(z.string()) });

export async function GET() {
  try {
    try {
      const id = await sessionId();
      if ((await mergeGuestWishlist(id)) === "pending")
        throw new ApiError(503, "WISHLIST_MERGE_PENDING");
      const result = await authRuntime().broker.read(id, (token) =>
        upstream("/wishlists/ids", idsResultSchema, undefined, token),
      );
      return json(result);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      return json({ ids: await guestWishlistIds() });
    }
  } catch (error) {
    return failure(error);
  }
}
