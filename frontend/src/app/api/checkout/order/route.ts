import { createOrderInputSchema, orderSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { userSchema } from "@/shared/auth/contracts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { idempotencyKey, ...input } = createOrderInputSchema.parse(await mutationBody(request));
    return json(
      await authRuntime().broker.write(
        await sessionId(),
        (token) =>
          upstream("/orders", orderSchema, input, token, "POST", {
            "Idempotency-Key": idempotencyKey,
          }),
        (token) => upstream("/auth/me", userSchema, undefined, token),
      ),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
