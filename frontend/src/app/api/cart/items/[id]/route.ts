import { z } from "zod";
import { guestCartSession } from "@/shared/auth/cart";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";
import { cartSchema } from "@/features/catalog/cart";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const updateSchema = z
  .object({
    quantity: z.number().int().min(1).max(100).optional(),
    isSelected: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.quantity !== undefined || value.isSelected !== undefined);

async function mutate(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND");
    const body = await mutationBody(request);
    const input =
      request.method === "PUT" ? updateSchema.parse(body) : z.object({}).strict().parse(body);
    const path = `/cart/items/${id}`;
    try {
      return json(
        await authRuntime().broker.write(
          await sessionId(),
          (token) => upstream(path, cartSchema, input, token, request.method),
          (token) => upstream("/auth/me", z.unknown(), undefined, token),
        ),
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const guest = await guestCartSession();
      if (!guest) throw new ApiError(401, "CART_SESSION_EXPIRED");
      return json(
        await upstream(
          path,
          cartSchema,
          request.method === "PUT" ? { ...input, sessionId: guest } : undefined,
          undefined,
          request.method,
          { "x-session-id": guest },
        ),
      );
    }
  } catch (error) {
    return failure(error);
  }
}
export const PUT = mutate;
export const DELETE = mutate;
