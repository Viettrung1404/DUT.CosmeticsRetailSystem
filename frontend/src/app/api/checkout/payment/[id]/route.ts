import { z } from "zod";
import { paymentStatusSchema } from "@/features/checkout/contracts";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { withGuestCheckout } from "@/shared/auth/checkout";
import { failure, json } from "@/shared/auth/http";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND");
    return json(
      await withGuestCheckout(
        () =>
          sessionId().then((session) =>
            authRuntime().broker.read(session, (token) =>
              upstream(`/payments/${id}/status`, paymentStatusSchema, undefined, token),
            ),
          ),
        (session) =>
          upstream(
            `/guest/payments/${id}/status`,
            paymentStatusSchema,
            undefined,
            undefined,
            "GET",
            { "x-session-id": session },
          ),
        false,
        true,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
