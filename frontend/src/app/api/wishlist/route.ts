import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";
import { listGuestWishlist, mergeGuestWishlist } from "@/shared/auth/wishlist";
import { wishlistSchema } from "@/features/post-purchase/contracts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("page") ?? "1");
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(new URL(request.url).searchParams.get("limit") ?? "10");
    try {
      const id = await sessionId();
      if ((await mergeGuestWishlist(id)) === "pending")
        throw new ApiError(503, "WISHLIST_MERGE_PENDING");
      return json(
        await authRuntime().broker.read(id, (token) =>
          upstream(`/wishlists?page=${page}&limit=${limit}`, wishlistSchema, undefined, token),
        ),
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      return json(await listGuestWishlist(page, limit));
    }
  } catch (error) {
    return failure(error);
  }
}
