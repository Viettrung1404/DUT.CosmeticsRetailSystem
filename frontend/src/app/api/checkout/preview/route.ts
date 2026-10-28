import { previewInputSchema, previewSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json, mutationBody } from "@/shared/auth/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = previewInputSchema.parse(await mutationBody(request));
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream("/orders/preview", previewSchema, input, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
