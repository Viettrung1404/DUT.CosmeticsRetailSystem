import { z } from "zod";
import { guestCartSession } from "@/shared/auth/cart";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";
import { cartSchema as cartDetailSchema } from "@/features/catalog/cart";
export const runtime = "nodejs";
const inputSchema = z
  .object({ productVariantId: z.uuid(), quantity: z.number().int().min(1).max(100) })
  .strict();
const cartSchema = z.object({ id: z.string(), totalQuantity: z.number() });
export async function GET() {
  try {
    try {
      return json(
        await authRuntime().broker.read(await sessionId(), (token) =>
          upstream("/cart", cartDetailSchema, undefined, token),
        ),
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const guest = await guestCartSession();
      if (!guest)
        return json({
          id: "",
          items: [],
          unavailableItems: [],
          totalQuantity: 0,
          subtotal: 0,
          selectedQuantity: 0,
          selectedSubtotal: 0,
          hasPriceChanges: false,
        });
      return json(
        await upstream("/cart", cartDetailSchema, undefined, undefined, "GET", {
          "x-session-id": guest,
        }),
      );
    }
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await mutationBody(request));
    let result: z.infer<typeof cartSchema>;
    try {
      result = await authRuntime().broker.write(
        await sessionId(),
        (token) => upstream("/cart/items", cartSchema, input, token),
        (token) => upstream("/auth/me", z.unknown(), undefined, token),
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const guest = await guestCartSession(true);
      result = await upstream("/cart/items", cartSchema, { ...input, sessionId: guest });
    }
    return json({ totalQuantity: result.totalQuantity });
  } catch (error) {
    return failure(error);
  }
}
