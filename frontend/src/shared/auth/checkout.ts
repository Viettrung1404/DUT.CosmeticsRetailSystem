import "server-only";
import { ApiError } from "@/shared/api/errors";
import { guestCheckoutSession } from "./cart";
export async function withGuestCheckout<T>(
  customer: () => Promise<T>,
  guest: (session: string) => Promise<T>,
  create = false,
  ownershipFallback = false,
): Promise<T> {
  try {
    return await customer();
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      !(ownershipFallback ? [401, 403, 404] : [401]).includes(error.status)
    )
      throw error;
    const session = await guestCheckoutSession(create);
    if (!session) throw error;
    return guest(session);
  }
}
