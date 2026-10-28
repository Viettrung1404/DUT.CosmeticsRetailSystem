import { z } from "zod";
import { paymentStatusSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND");
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream(`/payments/${id}/status`, paymentStatusSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
