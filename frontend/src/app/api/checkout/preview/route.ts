import { previewInputSchema, previewSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { withGuestCheckout } from "@/shared/auth/checkout";
import { failure, json, mutationBody } from "@/shared/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = previewInputSchema.parse(await mutationBody(request));
    return json(
      await withGuestCheckout(
        () =>
          sessionId().then((id) =>
            authRuntime().broker.read(id, (token) =>
              upstream("/orders/preview", previewSchema, input, token),
            ),
          ),
        (session) =>
          upstream("/guest/orders/preview", previewSchema, input, undefined, "POST", {
            "x-session-id": session,
          }),
        true,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
