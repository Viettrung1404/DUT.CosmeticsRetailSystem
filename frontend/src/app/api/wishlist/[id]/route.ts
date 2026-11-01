import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { changeGuestWishlist } from "@/shared/auth/wishlist";
import { wishlistChangeSchema, wishlistResultSchema } from "@/features/post-purchase/contracts";

export const runtime = "nodejs";
const inputSchema = wishlistChangeSchema.extend({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(255)
    .optional(),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(400, "INVALID_INPUT");
    const input = inputSchema.parse(await mutationBody(request));
    if (input.productId !== id) throw new ApiError(400, "ID_MISMATCH");
    try {
      return json(
        await authRuntime().broker.write(
          await sessionId(),
          (token) =>
            upstream(
              `/wishlists/${id}`,
              wishlistResultSchema,
              { selected: input.selected },
              token,
              "PUT",
              { "Idempotency-Key": input.idempotencyKey },
            ),
          (token) => upstream("/auth/me", userSchema, undefined, token),
        ),
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      return json(await changeGuestWishlist(id, input.slug, input.selected));
    }
  } catch (error) {
    return failure(error);
  }
}
