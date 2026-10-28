import { z } from "zod";
import { paymentSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { userSchema } from "@/shared/auth/contracts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = z
      .object({ orderId: z.uuid() })
      .strict()
      .parse(await mutationBody(request));
    return json(
      await authRuntime().broker.write(
        await sessionId(),
        (token) =>
          upstream("/payments/vnpay/create", paymentSchema, { ...input, platform: "WEB" }, token),
        (token) => upstream("/auth/me", userSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
