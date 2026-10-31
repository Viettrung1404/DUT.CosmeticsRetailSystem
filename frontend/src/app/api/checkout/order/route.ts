import { createOrderInputSchema, orderSchema } from "@/features/checkout/contracts";
import { userSchema } from "@/shared/auth/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { withGuestCheckout } from "@/shared/auth/checkout";
import { failure, json, mutationBody } from "@/shared/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { idempotencyKey, ...input } = createOrderInputSchema.parse(await mutationBody(request));
    return json(
      await withGuestCheckout(
        () =>
          sessionId().then((id) =>
            authRuntime().broker.write(
              id,
              (token) =>
                upstream("/orders", orderSchema, input, token, "POST", {
                  "Idempotency-Key": idempotencyKey,
                }),
              (token) => upstream("/auth/me", userSchema, undefined, token),
            ),
          ),
        (session) =>
          upstream("/guest/orders", orderSchema, input, undefined, "POST", {
            "x-session-id": session,
            "Idempotency-Key": idempotencyKey,
          }),
        true,
      ),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
