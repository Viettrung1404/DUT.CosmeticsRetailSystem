import { z } from "zod";
import { orderDetailSchema } from "@/features/account/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND");
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream(`/orders/${id}`, orderDetailSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, "NOT_FOUND");
    const input = z
      .object({ reason: z.string().trim().max(500).optional() })
      .strict()
      .parse(await mutationBody(request));
    return json(
      await authRuntime().broker.write(
        await sessionId(),
        (token) => upstream(`/orders/${id}/cancel`, orderDetailSchema, input, token, "PUT"),
        (token) => upstream("/auth/me", userSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
