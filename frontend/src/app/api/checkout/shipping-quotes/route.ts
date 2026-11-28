import {
  shippingQuoteInputSchema,
  shippingQuoteResponseSchema,
} from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { withGuestCheckout } from "@/shared/auth/checkout";
import { failure, json, mutationBody } from "@/shared/auth/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = shippingQuoteInputSchema.parse(await mutationBody(request));
    return json(
      await withGuestCheckout(
        () =>
          sessionId().then((id) =>
            authRuntime().broker.read(id, (token) =>
              upstream("/shipping/quotes", shippingQuoteResponseSchema, input, token),
            ),
          ),
        () =>
          upstream("/shipping/quotes", shippingQuoteResponseSchema, input),
        true,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
