import { z } from "zod";
import { paymentSchema } from "@/features/checkout/contracts";
import { userSchema } from "@/shared/auth/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { withGuestCheckout } from "@/shared/auth/checkout";
import { failure, json, mutationBody } from "@/shared/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = z
      .object({ orderId: z.uuid() })
      .strict()
      .parse(await mutationBody(request));
    return json(
      await withGuestCheckout(
        () =>
          sessionId().then((id) =>
            authRuntime().broker.write(
              id,
              (token) =>
                upstream(
                  "/payments/vnpay/create",
                  paymentSchema,
                  { ...input, platform: "WEB" },
                  token,
                ),
              (token) => upstream("/auth/me", userSchema, undefined, token),
            ),
          ),
        (session) =>
          upstream("/guest/payments/vnpay", paymentSchema, input, undefined, "POST", {
            "x-session-id": session,
          }),
        false,
        true,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
