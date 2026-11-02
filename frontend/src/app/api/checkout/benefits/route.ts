import { checkoutBenefitsSchema } from "@/features/checkout/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream("/customers/me/checkout-benefits", checkoutBenefitsSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
